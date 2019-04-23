/*global cv:true*/
function logErr(err) {
    if (typeof err === 'undefined') {
        err = '';
    } else if (typeof err === 'number') {
        if (!isNaN(err)) {
            if (typeof cv !== 'undefined') {
                err = 'Exception: ' + cv.exceptionFromPtr(err).msg;
            }
        }
    } else if (typeof err === 'string') {
        let ptr = Number(err.split(' ')[0]);
        if (!isNaN(ptr)) {
            if (typeof cv !== 'undefined') {
                err = 'Exception: ' + cv.exceptionFromPtr(ptr).msg;
            }
        }
    } else if (err instanceof Error) {
        err = err.stack.replace(/\n/g, '<br>');
    }
    console.log(err);
}

var self

function randInt(max) {
    return Math.floor(Math.random() * (max+1));
}

class Bee {
    constructor(id, rect, features, frame, snapshot, vidTime, setFocusCB) {
        this.id = id;
        this.features_ = features;
        this.color_ = [randInt(255), randInt(255), randInt(255), 255]
        this.valid_ = true;
        this.snapshot = snapshot;
        this.vidTime = vidTime;
        this.history = [{rect: rect, frame: frame}];
        this.setFocusCB = setFocusCB;
    }
    destroy() {
        this.snapshot.delete();
    }
    setFocus() {
        this.setFocusCB(this);
    }
    get valid() {
        return this.valid_;
    }
    set valid(val) {
        this.valid_ = val;
    }
    get color() {
        return this.color_;
    }
    get features() {
        return this.features_;
    }
    set features(ft) {
        this.features_ = ft;
    }
    get currRect() {
        return this.history[this.history.length - 1].rect;
    }
    get lastActiveFrame() {
        return this.history[this.history.length - 1].frame;
    }
    addRect(rect, frame) {
        this.history.push({rect: rect, frame: frame});
    }
    adjustRect(x_off, y_off, frame) {
        let r = this.currRect;
        let r2 = new cv.Rect(r.x+x_off, r.y+y_off, r.width, r.height);
        this.addRect(r2, frame);
    }
    contains(pt) {
        return this.currRect.contains(pt);
    }
}

class BeeFocus {
    constructor(bee, callback) {
        this.bee_ = bee; 
        this.callback = callback;
        this.curr_frame = bee.history[0].frame;
        this.last_frame = bee.lastActiveFrame;
        this.hist_index = 0;
        this.bee_.history.push(this.bee_.history[0]);
    }
    get bee() {
        return this.bee_;
    }
    reset() {
        this.bee_.history.pop();
        this.callback();
    }
    nextFrame() {
        this.curr_frame++;
        if (this.curr_frame === this.last_frame)
            return false;
        if (this.curr_frame === this.bee_.history[this.hist_index + 1].frame) {
            this.bee_.history[this.bee_.history.length - 1] = this.bee_.history[this.hist_index++];
        }
        return true;
    }
}

const MAX_INACTIVE_FRAMES = 10;
const MIN_TRACK_PCT = 0.3;
const DETECT_INTERVAL = 6;
const MIN_ARCHIVE_FRAMES = 40;
const FPS = 30;

/*hyper parameters!*/

class BeeDetect {
    constructor(video, canvas_id, class_file, addBee)  {
        this.canvas_id = canvas_id; 
        this.video = video;
        this.cap = new cv.VideoCapture(video);
        this.streaming = false;
        this.class_file = class_file;
        this.frame = null; 
        this.curr_frame = 0;
        this.activeBees = new Array();
        
        this.addBee = addBee; 
        this.savedBees = new Set();
        this.beeFocus = null;
        this.next_id = 0;

        this.prev_frame = null;
        this.corners = null;
        this.status = null;
        this.err = null;
        this.track = null;

        this.corner_pts = new Array(); 
        this.track_pts = new Array();
        this.point_map = new Array();
        self = this;
    }
    
    destroy() {
        this.frame.delete();
        this.prev_frame.delete();
        this.corners.delete();
        this.status.delete();
        this.err.delete();
        this.track.delete();
    }

    startDetect() {
        this.streaming = true;
        this.frame = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4);
        this.prev_frame = new cv.Mat()
        this.corners = new cv.Mat();
        this.status = new cv.Mat();
        this.err = new cv.Mat();
        this.track = new cv.Mat();
        this.video.play().then(() => {
            setTimeout(this.processFrame, 0);
        });
    }

    stopDetect() {
        this.video.pause();
        this.video.currentTime = 0;
        this.beeFocus = null;
        this.streaming = false;
        this.destroy();
    }

    copyTrackedPoints() {
        this.corners.delete(); 
        this.corners = new cv.Mat(this.track_pts.length, 1, cv.CV_32FC2);
        this.corner_pts = this.track_pts;
        for (let i = 0; i < this.track_pts.length; i++) {
            this.corners.data32F[i*2] = this.track_pts[i].x;
            this.corners.data32F[i*2+1] = this.track_pts[i].y;
        }
    }

    processFrame() {
        try {
            if (!self.streaming) {
                return;
            }
            let begin = Date.now();
            self.cap.read(self.frame);
            if (self.beeFocus !== null) {
                self.drawOneBee(self.beeFocus.bee);
                cv.imshow(self.canvas_id, self.frame);
                if (!self.beeFocus.nextFrame()) {
                    self.beeFocus.reset();
                }
            }
            else {
                if (!self.corners.rows || !(self.curr_frame % DETECT_INTERVAL)) {
                    self.getFeatures();
                    self.detectBees();
                }
                else {
                    self.getOptFlow();
                    self.trackBees();
                    self.copyTrackedPoints();
                }
                self.removeOld();
                self.storeBees();
                self.drawBees();
                self.curr_frame++;
                self.frame.copyTo(self.prev_frame);
                cv.imshow(self.canvas_id, self.frame);
            }
            let delay = 1000 / FPS - (Date.now() - begin);
            setTimeout(self.processFrame, delay);
        }
        catch(err) {
            logErr(err);
        }
    }

    removeOld() {
        this.activeBees = this.activeBees.filter((bee) => 
            this.curr_frame - bee.lastActiveFrame <= MAX_INACTIVE_FRAMES
        );
    }


    storeBees() {
        this.activeBees.forEach((bee) => {
            if (bee.history.length == MIN_ARCHIVE_FRAMES && !this.savedBees.has(bee.id)) {
                this.addBee(bee);
                this.savedBees.add(bee.id);
            }
        });
    }

    getFeatures() {
        let canvas = this.frame
        let gray = new cv.Mat()
        let none = new cv.Mat()
        let [maxCorners, qualityLevel, minDistance, blockSize] =
            [150, 0.3, 7, 3]
        cv.cvtColor(canvas, gray, cv.COLOR_RGBA2GRAY, 0);
        cv.goodFeaturesToTrack(gray, this.corners, maxCorners, qualityLevel, minDistance, none, blockSize);
        this.corner_pts = []
        for (let i = 0; i < this.corners.rows; i++) {
            let [x,y] = [this.corners.data32F[i*2], this.corners.data32F[i*2+1]]
            this.corner_pts.push(new cv.Point(x,y))
        }
        gray.delete();
    }

    getOptFlow() {
        let p_gray = new cv.Mat()
        let c_gray = new cv.Mat()
        cv.cvtColor(this.prev_frame, p_gray, cv.COLOR_RGBA2GRAY, 0);
        cv.cvtColor(this.frame, c_gray, cv.COLOR_RGBA2GRAY, 0);
        let winSize = new cv.Size(15,15)
        let maxLevel = 2;
        let criteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.03);
        cv.calcOpticalFlowPyrLK(p_gray, c_gray, this.corners, this.track, this.status, this.err, winSize, maxLevel, criteria);
        this.track_pts = []
        this.point_map = new Array(this.status.rows)
        this.point_map.fill(-1);
        let k = 0;
        for (let i = 0; i < this.status.rows; i++) {
            if (this.status.data[i] === 1) {
                let [x,y] = [this.track.data32F[i*2], this.track.data32F[i*2+1]];
                this.track_pts.push(new cv.Point(x,y));
                this.point_map[i] = k++;
            }
        }
        p_gray.delete();
        c_gray.delete();
    }

    containsOtherRect(r1, r2) {
        let p1 = new cv.Point(r2.x, r2.y);
        return this.containsPoint(r1, p1) && r1.x + r1.width >= r2.x + r2.width &&
            r1.y + r1.height >= r2.y + r2.height;
    }

    containsPoint(r, pt) {
        return r.x <= pt.x && r.y <= pt.y && r.x + r.width >= pt.x && r.y + r.height >= pt.y;
    }

    trackBees() {
        this.activeBees.forEach(b => {
            if (!b.valid) return;
            let avg_x_offset = 0.0, avg_y_offset = 0.0;
            let tot_pts = b.features.length;
            let tracked_fts = b.features.filter(idx => this.status.data[idx] === 1);
            let num_tracked = tracked_fts.length; 
            let old_pts = tracked_fts.map(idx => this.corner_pts[idx]);
            b.features = tracked_fts.map(idx => this.point_map[idx])
            let new_pts = b.features.map(idx => this.track_pts[idx]);
            for (let i = 0; i < num_tracked; i++) {
                avg_x_offset += new_pts[i].x - old_pts[i].x; 
                avg_y_offset += new_pts[i].y - old_pts[i].y;
            }
            if (tot_pts == 0 || num_tracked / tot_pts < MIN_TRACK_PCT) {
                b.valid = false;
            }
            else {
                avg_x_offset /= num_tracked;
                avg_y_offset /= num_tracked;
                b.adjustRect(avg_x_offset, avg_y_offset, this.curr_frame);
            }
        });
    }

    //filter bees that contain other bees and are too big / small compared to avg (1.5 SD)
    getGoodBees(bees, beeFeatures) {
        let isGood = new Array(bees.size())
        //*let tot_area = 0.0, n_bees = 0;
        for (let i = 0; i < bees.size(); i++) {
            isGood[i] = beeFeatures.length > 0;
         /*   if (isGood[i]) {
                tot_area += bees[i].width * bees[i].height;
                n_bees++;
            }*/
        }
        //if (!n_bees) return isGood;
        /*let avg_area = tot_area / n_bees;
        let area_sd = 0.0;
        for (let i = 0; i < bees.size(); i++) {
            if (isGood[i]) {
                let area = bees[i].width * bees[i].height;
                area_sd += (area - avg_area)*(area - avg_area);
            }
        }
        area_sd = Math.sqrt(area_sd / n_bees);*/
        for (let i = 0; i < bees.size() - 1; i++) {
            //let area = bees[i].width * bees[i].height;
            //isGood[i] &= Math.abs(area - avg_area) <= 1.5 * area_sd;
            if (isGood[i]) {
                let b1 = bees.get(i);
                for (let j = i+1; j < bees.size(); j++) {
                    let b2 = bees.get(j);
                    if (this.containsOtherRect(b1, b2)) {
                        isGood[i] = false;
                        break;
                    }
                    if (this.containsOtherRect(b2, b1)) {
                        isGood[j] = false;
                    }
                }
            }
        }
        return isGood;
    }

    setBeeFocus(bee) {
        if (this.beeFocus !== null) return;
        let currTime = this.video.currentTime;
        let endFocusCB = !this.streaming ? () => { 
            this.stopDetect();
        } : () => {
            this.beeFocus = null;
            this.video.currentTime = currTime; 
        };
        this.beeFocus = new BeeFocus(bee, endFocusCB);
        this.video.currentTime = bee.vidTime;
        if (!this.streaming) {
            this.startDetect();
        }
    }

    detectBees()  {
        let canvas = this.frame
        let gray = new cv.Mat();
        cv.cvtColor(canvas, gray, cv.COLOR_RGBA2GRAY, 0);
        let bees = new cv.RectVector();

        let beesCascade = new cv.CascadeClassifier();
        beesCascade.load(this.class_file);

        let minsize = new cv.Size(30, 30), maxsize = new cv.Size(200,200);
        beesCascade.detectMultiScale(gray, bees, 1.1, 3, 0, minsize, maxsize);

        let beeFeatures = new Array(bees.size()); 
        for (let i = 0; i < bees.size(); i++) {
            let b = bees.get(i);
            beeFeatures[i] = [];
            for (let j = 0; j < this.corner_pts.length; j++) {
                if (this.containsPoint(b, this.corner_pts[j])) {
                    beeFeatures[i].push(j);
                }
            }
        }

        const MAX_DIST_SAME = 40;
        let isActive = new Array(bees.size());
        isActive.fill(false);

        this.activeBees.forEach((bee) => {
            bee.valid = false;
            let minDist = this.frame.rows + this.frame.cols, minIndex = -1;
            for (let i = 0; i < bees.size(); i++) {
                if (!isActive[i]) {
                    let r = bee.currRect;
                    let dist = Math.abs(r.x - bees.get(i).x) + Math.abs(r.y - bees.get(i).y);
                    if (dist < minDist) {
                        minDist = dist;
                        minIndex = i;
                    }
                }
            }
            if (minDist < MAX_DIST_SAME) {
                bee.addRect(bees.get(minIndex), this.curr_frame);
                bee.features = beeFeatures[minIndex];
                bee.valid = true;
                isActive[minIndex] = true;
            }
        });

        let isGood = this.getGoodBees(bees, beeFeatures);

        let snapshot = new cv.Mat();
        for (let i = 0; i < bees.size(); i++) {
            if (!isActive[i] && isGood[i]) {
                snapshot = canvas.roi(bees.get(i));
                let setFocusCB = (bee) => {
                    this.setBeeFocus(bee);
                };
                let b = new Bee(this.next_id++, bees.get(i), beeFeatures[i], this.curr_frame, snapshot.clone(),
                                this.video.currentTime, setFocusCB.bind(this));
                this.activeBees.push(b);
            }
        }
        gray.delete(); beesCascade.delete(); bees.delete(); snapshot.delete();
    }

    drawOneBee(b) {
        let canvas = this.frame
        var r = b.currRect;
        let center = new cv.Point(r.x + r.width / 2, r.y + r.height / 2);
        let sz = new cv.Size(r.width / 2, r.height / 2);
        cv.ellipse(canvas, center, sz, 0, 0, 360, b.color, 4, 8, 0);
        if (this.beeFocus === null) {
            let rad = 4;
            b.features.forEach((ft) => {
                let pt = this.corner_pts[ft];
                cv.circle(canvas, pt, rad, b.color, -1);
            });
        }
    }

    drawBees() {
        for (var i = 0; i < this.activeBees.length; i++) {
            let b = this.activeBees[i];
            if (b.valid) {
                this.drawOneBee(b);
            }
        }
    }
}

export default BeeDetect;
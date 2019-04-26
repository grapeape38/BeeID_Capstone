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
        this.lastFrame = frame;
        this.history = [{rect: rect, time: vidTime}];
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
        return this.lastFrame; 
    }
    addRect(rect, frame, time) {
        this.lastFrame = frame;
        this.history.push({rect: rect, time: time});
    }
    adjustRect(x_off, y_off, frame, time) {
        let r = this.currRect;
        let r2 = new cv.Rect(r.x+x_off, r.y+y_off, r.width, r.height);
        this.addRect(r2, frame, time);
    }
    contains(pt) {
        return this.currRect.contains(pt);
    }
}

class BeeFocus {
    constructor(bee, callback) {
        this.bee_ = bee; 
        this.callback = callback;
        this.last_time = this.bee.history[this.bee.history.length - 1].time; 
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
    isVisible(time) {
        return time >= this.bee_.history[this.hist_index].time;
    }
    nextFrame(time) {
        if (time >= this.last_time) {
            return false;
        }
        if (time >= this.bee_.history[this.hist_index].time) {
            this.bee_.history[this.bee_.history.length - 1] = this.bee_.history[this.hist_index++];
        }
        return true;
    }
}

const MAX_INACTIVE_FRAMES = 10;
const MIN_TRACK_PCT = 0.3;
const DETECT_INTERVAL = 6;
const MIN_ARCHIVE_FRAMES = 40;
const MAX_DIST_SAME = 40;
const FPS = 30.0;

class HyperParams {
    constructor() {
        this.MAX_INACTIVE_FRAMES = 10;
        this.MIN_TRACK_PCT = 0.3;
        this.DETECT_INTERVAL = 6;
        this.MIN_ARCHIVE_FRAMES = 40;
        this.MAX_DIST_SAME = 40;

        this.cascade = {
            minsize: new cv.Size(30, 30),
            maxsize:  new cv.Size(200,200)
        };
        this.featureDetector = {
            maxCorners: 150, 
            qualityLevel: 0.3,
            minDistance: 7,
            blockSize: 3
        };
        this.optFlow = {
            winSize: new cv.Size(15,15),
            maxLevel: 2,
            criteria: new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.03)
        }
    }
}

class BeeDetect {
    constructor(video_id, canvas_id, class_file/*, addBee*/)  {
        this.canvas_id = canvas_id; 
        this.video = document.getElementById(video_id);
        this.streaming = false;
        this.class_file = class_file;
        this.frame = null; 
        this.curr_frame = 0;
        this.activeBees = new Array();
        this.cap = null;
        
        //this.addBee = addBee; 
        this.beeList = [];
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
        this.beesCascade.delete();
    }

    startDetect() {
        this.streaming = true;
        this.cap = new cv.VideoCapture(this.video);
        this.frame = new cv.Mat(this.video.height, this.video.width, cv.CV_8UC4);
        this.prev_frame = new cv.Mat()
        this.corners = new cv.Mat();
        this.status = new cv.Mat();
        this.err = new cv.Mat();
        this.track = new cv.Mat();
        this.beesCascade = new cv.CascadeClassifier();
        this.beesCascade.load(this.class_file);
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
                let time = self.video.currentTime;
                self.drawOneBee(self.beeFocus.bee);
                cv.imshow(self.canvas_id, self.frame);
                if (!self.beeFocus.nextFrame(time)) {
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
                //this.addBee(bee);
                this.beeList.push(bee);
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
        if (r1 == r2) return false;
        let p1 = new cv.Point(r2.x, r2.y);
        return this.containsPoint(r1, p1) && r1.x + r1.width >= r2.x + r2.width &&
            r1.y + r1.height >= r2.y + r2.height;
    }

    containsPoint(r, pt) {
        return r.x <= pt.x && r.y <= pt.y && r.x + r.width >= pt.x && r.y + r.height >= pt.y;
    }

    trackBees() {
        let time = this.video.currentTime;
        this.activeBees.forEach(b => {
            if (!b.valid) return;
            b.valid = false;
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
            if (tot_pts > 0 && num_tracked / tot_pts >= MIN_TRACK_PCT) {
                avg_x_offset /= num_tracked;
                avg_y_offset /= num_tracked;
                b.adjustRect(avg_x_offset, avg_y_offset, this.curr_frame, time);
                b.valid = true;
            }
        });
    }

    getGoodBees(bees) {
        return bees.filter(b1 => 
            !bees.some(b2 => this.containsOtherRect(b1.rect, b2.rect))
        );
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
        let beeVec = new cv.RectVector();

        let minsize = new cv.Size(30, 30), maxsize = new cv.Size(200,200);
        this.beesCascade.detectMultiScale(gray, beeVec, 1.1, 3, 0, minsize, maxsize);

        let bees = new Array();
        for (let i = 0; i < beeVec.size(); i++) {
            let b = beeVec.get(i);
            let fts = [];
            for (let j = 0; j < this.corner_pts.length; j++) {
                if (this.containsPoint(b, this.corner_pts[j])) {
                    fts.push(j);
                }
            }
            if (fts.length > 0)
                bees.push({rect: b, features: fts, area: b.width * b.height});
        }

        if (bees.length > 0) {
            let time = this.video.currentTime;

            bees = this.getGoodBees(bees);

            this.activeBees.forEach((bee) => {
                bee.valid = false;
                let r = bee.currRect;
                let beeDist = bees.map(b => Math.abs(r.x - b.rect.x) + Math.abs(r.y - b.rect.y));
                let minDist = beeDist[0], minIndex = 0;
                beeDist.forEach((dist, i) => {
                    if (dist < minDist) {
                        minIndex = i;
                        minDist = dist;
                    }
                });
                if (minDist <= MAX_DIST_SAME) {
                    bee.valid = true;
                    bee.addRect(bees[minIndex].rect, this.curr_frame, time);
                    bee.features = bees[minIndex].features;
                    bees.splice(minIndex, 1);
                }
            });

            let snapshot = new cv.Mat();
            let setFocusCB = (b) => {
                this.setBeeFocus(b);
            };
            bees.forEach(bee => {
                snapshot = canvas.roi(bee.rect);
                let b = new Bee(this.next_id++, bee.rect, bee.features, this.curr_frame, snapshot.clone(),
                                time, setFocusCB.bind(this));
                this.activeBees.push(b);
            });
            snapshot.delete();
        }
        gray.delete(); beeVec.delete();
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
        this.activeBees.filter(b => b.valid).forEach(b => {
            this.drawOneBee(b);
        });
    }
}

export default BeeDetect;
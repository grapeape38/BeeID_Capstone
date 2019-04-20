const FPS = 60;
var self

class BeeDetect {
    constructor(video, canvas_id, class_file) {
        this.canvas_id = canvas_id; 
        this.cap = new cv.VideoCapture(video);
        this.streaming = false;
        this.class_file = class_file;
        this.frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        self = this
    }
    
    destroy() {
        this.frame.delete();
    }

    startDetect() {
        this.streaming = true;
        setTimeout(this.processFrame, 0);
    }

    stopDetect() {
        this.streaming = false;
    }

    processFrame() {
        try {
            if (!self.streaming) {
                self.destroy();
                return;
            }
            let begin = Date.now();
            self.cap.read(self.frame);
            self.detectAndDraw(self.frame);
            cv.imshow(self.canvas_id, self.frame);
            let delay = 1000 / FPS - (Date.now() - begin);
            setTimeout(self.processFrame, delay);
        }
        catch(err) {
            console.log("Error: ", err);
        }
    }

    detectAndDraw(canvas)  {
        let gray = new cv.Mat();
        //let canvas = cv.imread(this.canvas_id);
        //let canvas = this.src.clone();
        cv.cvtColor(canvas, gray, cv.COLOR_RGBA2GRAY, 0);
        let bees = new cv.RectVector();
        let beesCascade = new cv.CascadeClassifier();
        // load pre-trained classifiers
        beesCascade.load(this.class_file);
        // detect faces
        let minsize = new cv.Size(30, 30), maxsize = new cv.Size(200,200);
        beesCascade.detectMultiScale(gray, bees, 1.1, 3, 0, minsize, maxsize);
        this.drawEllipses(canvas, bees);
        gray.delete(); beesCascade.delete(); bees.delete();
    }

    drawEllipses(mat, bees) {
        let color = [0,255,0,255];
        for (var i = 0; i < bees.size(); i++) {
            var b = bees.get(i)
            let center = new cv.Point(b.x + b.width / 2, b.y + b.height / 2);
            let sz = new cv.Size(b.width / 2, b.height / 2);
            cv.ellipse(mat, center, sz, 0, 0, 360, color, 4, 8, 0);
        }
    }
}

export default BeeDetect;
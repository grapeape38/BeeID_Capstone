#include "opencv2/objdetect.hpp"
#include "opencv2/videoio.hpp"
#include "opencv2/opencv.hpp"
#include "opencv2/highgui.hpp"
#include "opencv2/imgproc.hpp"
#include <iostream>
#include <numeric>
#include <stdio.h>
using namespace std;
using namespace cv;
String bees_cascade_file; 
CascadeClassifier bees_cascade;
RNG rng(1234);

String window_name = "Capture - Bee detection";

struct BeeStamp {
    Rect rect;
    int frame_no;
};

struct Bee {
    int id;
    vector<BeeStamp> history;
    Scalar color;
    vector<int> featureIndex;
    bool valid;
    Bee(int i, Rect r, vector<int> ft, int frame_no) : 
        id(i), featureIndex(ft),
        color(rng.uniform(0,255), rng.uniform(0,255), rng.uniform(0,255)),
        valid(true)
    {
        history.push_back({r, frame_no});
    }
    Bee() = default;

    const Rect &getRect() const { return history.back().rect; } 
    int getLastActiveFrame() const { return history.back().frame_no; } 
    void addRect(Rect &r, int frame_no) { history.push_back({r, frame_no}); }

    bool contains(const Point2i &pt) const {
        return getRect().contains(pt);
    }

};

void trackBees( Mat frame, const vector<Point2f> &prev_pts, const vector<Point2f> &tracked_pts,
    const vector<uchar> &status, vector<Bee> &activeBees, int frame_no);
void detectBees(Mat frame, Mat canvas, vector<Bee> &activeBees, const vector<Point2f> &corners, int frame_no);
void drawFeatures(Mat canvas, vector<Point2f> &corners);
void getOptFlow(Mat prev, Mat curr, const vector<Point2f> &p0, 
    vector<Point2f> &p1, vector<uchar> &status, Mat canvas);
void drawBees(Mat canvas, const vector<Bee> &activeBees);


const int MAX_INACTIVE_FRAMES = 10;

inline void removeOld(vector<Bee> &bees, int frame_no) {
    auto newEnd = remove_if(bees.begin(), bees.end(), [=](const Bee &b) {
        return frame_no - b.getLastActiveFrame() > MAX_INACTIVE_FRAMES; });
    size_t newSize = newEnd - bees.begin();
    bees.resize(newSize);
}

int main( int argc, const char** argv )
{
    CommandLineParser parser(argc, argv,
        /*"{help h||}\
        {input|../videos/rpi12b/rpi12b@2018-07-15@11-45-49|}\*/
        "{help h||}\
        {input|../videos/rpi11b/rpi11b@2018-06-20@12-35-58|}\
        {bees_cascade|../data/haarcascades/rpi11b.xml|}");
    if (parser.has("help")) {
        parser.printMessage();
        return 0;
    }
    bees_cascade_file = parser.get<string>("bees_cascade");
    Mat frame;
    //-- 1. Load the cascades
    if( !bees_cascade.load( bees_cascade_file ) ){ printf("--(!)Error loading bees cascade\n"); return -1; };
    //-- 2. Read the video stream
    String input_name = parser.get<String>("input");
    VideoCapture capture(parser.get<String>("input"));
    if ( ! capture.isOpened() ) { printf("--(!)Error opening video capture\n"); return -1; }
    int frame_width = capture.get(CAP_PROP_FRAME_WIDTH); 
    int frame_height = capture.get(CAP_PROP_FRAME_HEIGHT); 
    int fps = capture.get(CAP_PROP_FPS);
    VideoWriter video("output/output.avi",VideoWriter::fourcc('M','J','P','G'),fps, Size(frame_width,frame_height)); 
    vector<Point2f> prev;
    Mat old_frame;

    const int DETECT_INTERVAL = 5; 

    vector<Bee> activeBees;
    while ( capture.read(frame) )
    {
        if( frame.empty() )
        {
            printf(" --(!) No captured frame -- Break!");
            break;
        }
        int frame_no = capture.get(CAP_PROP_POS_FRAMES);
        vector<Point2f> tracked_pts;
        vector<uchar> status;
        Mat canvas = frame.clone();
        if (prev.empty() || !(frame_no % DETECT_INTERVAL)) {
            drawFeatures(canvas, tracked_pts);
        }
        else {
            getOptFlow(old_frame, frame, prev, tracked_pts, status, canvas);
            trackBees(frame, prev, tracked_pts, status, activeBees, frame_no);
        }
        if (!(frame_no % DETECT_INTERVAL)) {
            detectBees(frame, canvas, activeBees, tracked_pts, frame_no);
        }
        removeOld(activeBees, frame_no);
        drawBees(canvas, activeBees);
        imshow(window_name, canvas);
        video.write(canvas);
        char c = (char)waitKey(10);
        if( c == 27 ) { break; } // escape
        old_frame = frame.clone();
        prev = tracked_pts;
    }
    capture.release();
    video.release();
    return 0;
}

void drawFeatures(Mat frame, vector<Point2f> &corners) {
    static int maxCorners = 150, minDistance = 7, blockSize = 3;
    static double qualityLevel = 0.3, k = 0.04;
    Mat frame_gray;
    cvtColor( frame, frame_gray, COLOR_BGR2GRAY );
    goodFeaturesToTrack(frame_gray, corners, maxCorners, qualityLevel,
        minDistance, Mat(), blockSize);
    static int r = 4;
    for (const Point2f &pt : corners) {
        circle(frame, pt, r, Scalar(rng.uniform(0,255), rng.uniform(0,255), rng.uniform(0,255)));
    }
}

bool containsOtherRect(const Rect &r1, const Rect &r2) {
    Point2i leftCorn {r2.x, r2.y};
    return r1.contains(leftCorn) && r1.x+r1.width >= r2.x+r2.width
        && r1.y+r1.height >= r2.y + r2.height;
}

void getOptFlow(Mat prev, Mat curr, const vector<Point2f> &p0, 
    vector<Point2f> &p1, vector<uchar> &status, Mat canvas) {
    Mat prev_gray, curr_gray;
    cvtColor( prev, prev_gray, COLOR_BGR2GRAY );
    cvtColor( curr, curr_gray, COLOR_BGR2GRAY );
    static Size winsize(15,15);
    static int maxLevel = 2;
    vector<float> err;
    static TermCriteria criteria(
        TermCriteria::COUNT | TermCriteria::EPS, 10, 0.03);
    calcOpticalFlowPyrLK(prev_gray, curr_gray, p0, p1, status, err, winsize, maxLevel, criteria);
    static int r = 4;
    size_t k = 0;
    for (size_t i = 0; i < p1.size(); i++) {
        if (!status[i]) continue;
        p1[k++] = p1[i];
    }
    p1.resize(k);
    for (const Point2f &pt : p1) {
        circle(canvas, pt, r, Scalar(rng.uniform(0,255), rng.uniform(0,255), rng.uniform(0,255)));
    }
}

void drawBees(Mat canvas, const vector<Bee> &activeBees) {
    for (const Bee &b : activeBees) {
        if (b.valid) {
            const Rect &r = b.getRect();
            Point center( r.x + r.width/2, r.y + r.height/2 );
            ellipse(canvas, center, Size( r.width/2, r.height/2 ), 0, 0, 360, b.color, 4, 8, 0 );
        }
    }
}

void detectBees(Mat frame, Mat canvas, vector<Bee> &activeBees, const vector<Point2f> &corners, int frame_no) {
    vector<Rect> bees;
    Mat frame_gray;
    cvtColor( frame, frame_gray, COLOR_BGR2GRAY );
    equalizeHist( frame_gray, frame_gray );
    //-- Detect bees
    bees_cascade.detectMultiScale( frame_gray, bees, 1.1, 2, 0|CASCADE_SCALE_IMAGE, Size(30, 30), Size(110, 110));
    vector<bool> containsAnotherBee(bees.size(), false),
                 isActive(bees.size(), false);
    vector<vector<int>> beePoints(bees.size());
    char fname[1024];

    for (size_t t = 0; t < corners.size(); t++) {
        for (size_t i = 0; i < bees.size(); i++) {
            if (bees[i].contains(corners[t])) {
                beePoints[i].push_back(t);
            }
        }
    }

    static const int MAX_DIST_SAME = 40;

    for (Bee &b : activeBees) {
        b.valid = false;
        int minDist = frame.rows + frame.cols, minIndex = -1;
        for (size_t i = 0; i < bees.size(); i++) {
            if (!isActive[i]) {
                const Rect &r = b.getRect();
                int dist = abs(r.x - bees[i].x) + abs(r.y - bees[i].y);
                if (dist < minDist) {
                    minDist = dist;
                    minIndex = i;
                }
            }
        }
        if (minDist < MAX_DIST_SAME) {
            b.addRect(bees[minIndex], frame_no);
            b.featureIndex = beePoints[minIndex];
            b.valid = true;
            isActive[minIndex] = true;
        }
    }

    for (size_t i = 0; i < bees.size() - 1; i++) {
        if (containsAnotherBee[i]) continue;
        for (size_t j = i+1; j < bees.size(); j++) {
            if (containsOtherRect(bees[i], bees[j])) {
                containsAnotherBee[i] = true;
                break;
            }
            if (containsOtherRect(bees[j], bees[i])) {
                containsAnotherBee[j] = true;
            }
        }
    }

    double avg_area = accumulate(bees.begin(), bees.end(), 0.0, [](double tot, Rect bee) { return tot + bee.area(); }) / bees.size();
    double area_sd = sqrt(accumulate(bees.begin(), bees.end(), 0.0, [&](double tot, Rect bee)
      {
        return tot + (bee.area() - avg_area)*(bee.area() - avg_area);
      }) / (bees.size() - 1));

    static int bee_id = 0;
    for (size_t i = 0; i < bees.size(); i++ )
    {
        if (!isActive[i]) {
            if (containsAnotherBee[i]) {
                sprintf(fname, "output/contains_two/frame%d_bee%d.jpg", frame_no, (int)i);
            }
            else if (abs(bees[i].area() - avg_area) > 1.5*area_sd) {
                sprintf(fname, "output/wrong_size/frame%d_bee%d.jpg", frame_no, (int)i);
            }
            else if (!beePoints[i].size()) {
                sprintf(fname, "output/no_corner/frame%d_bee%d.jpg", frame_no, (int)i);
            }
            else {
                Bee b(bee_id++, bees[i], beePoints[i], frame_no);
                sprintf(fname, "output/good_bees/frame%d_beeid%d.jpg", frame_no, b.id);
                activeBees.push_back(b);
            }
            Mat beeROI = frame(bees[i]);
            imwrite(fname, beeROI);
        }
    }
}

const float MIN_TRACK_PCT = 0.3f;

void trackBees( Mat frame, const vector<Point2f> &prev_pts, const vector<Point2f> &tracked_pts,
    const vector<uchar> &status, vector<Bee> &activeBees, int frame_no)
{
    char fname[1024];
    vector<bool> untracked(activeBees.size(), true);
    vector<int> correspFeature(prev_pts.size(), -1);
    size_t k = 0;
    for (size_t i = 0; i < prev_pts.size(); i++) {
        if (!status[i]) continue;
        correspFeature[i] = k++;
    }
    for (Bee &b : activeBees) {
        if (!b.valid) continue;
        int num_tracked = 0, tot_pts = 0;
        double avg_x_offset = 0.0, avg_y_offset = 0.0;
        for (int &idx : b.featureIndex) {
            if (idx >= 0 && status[idx]) {
                num_tracked++;
                Point2f newPt = tracked_pts[correspFeature[idx]];
                avg_x_offset += newPt.x - prev_pts[idx].x;
                avg_y_offset += newPt.y - prev_pts[idx].y;
            }
            if (idx >= 0) tot_pts++;
            idx = correspFeature[idx];
        }
        if (!tot_pts || num_tracked / tot_pts < MIN_TRACK_PCT) {
            b.valid = false;
        }
        else {
            avg_x_offset /= num_tracked;
            avg_y_offset /= num_tracked;
            Rect r = b.getRect();
            r.x += avg_x_offset;
            r.y += avg_y_offset;
            b.addRect(r, frame_no);
        }
    }
}

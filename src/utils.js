const OPENCV_URL = 'opencv.js';

class Utils { // eslint-disable-line no-unused-vars
    //    let self = this;
    loadOpenCv() {
        return new Promise((resolve, reject) => {
            let script = document.createElement('script');
            script.setAttribute('async', '');
            script.setAttribute('type', 'text/javascript');
            script.src = OPENCV_URL;
            let node = document.getElementsByTagName('script')[0];
            node.parentNode.insertBefore(script, node);
            script.onload = () => { 
                /*if (cv.getBuildInformation)
                {
                    //console.log(cv.getBuildInformation());
                }
                else
                {
                    // WASM
                    cv['onRuntimeInitialized']=()=>{
                     //   console.log(cv.getBuildInformation());
                    }
                }*/
                console.log("opencv loaded");
                resolve();
            }
        });
    }

    createFileFromUrl(path, url) {
        return new Promise((resolve, reject) => {
            let request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            request.onload = function(ev) {
                if (request.readyState === 4) {
                    if (request.status === 200) {
                        let data = new Uint8Array(request.response);
                        cv.FS_createDataFile('/', path, data, true, false, false);
                        resolve();
                    } else {
                        this.printError('Failed to load ' + url + ' status: ' + request.status);
                        reject();
                    }
                }
            };
            request.send();
        });
    }

    createFileLocal(file) {
        let data = new Uint8Array(file);
        let path = URL.createObjectURL(file);
        console.log(data, path);
        cv.FS_createDataFile('/', path, data, true, false, false);
    }

    loadImageToCanvas(url, canvasId) {
        let canvas = document.getElementById(canvasId);
        let ctx = canvas.getContext('2d');
        let img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);
        };
        img.src = url;
    }

    executeCode(textAreaId) {
        try {
            this.clearError();
            let code = document.getElementById(textAreaId).value;
            eval(code);
        } catch (err) {
            this.printError(err);
        }
    }

    /*this.clearError = function() {
        this.errorOutput.innerHTML = '';
    };*/

    printError(err) {
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

    loadCode(scriptId, textAreaId) {
        let scriptNode = document.getElementById(scriptId);
        let textArea = document.getElementById(textAreaId);
        if (scriptNode.type !== 'text/code-snippet') {
            throw Error('Unknown code snippet type');
        }
        textArea.value = scriptNode.text.replace(/^\n/, '');
    }

    addFileInputHandler(fileInputId, canvasId) {
        let inputElement = document.getElementById(fileInputId);
        inputElement.addEventListener('change', (e) => {
            let files = e.target.files;
            if (files.length > 0) {
                let imgUrl = URL.createObjectURL(files[0]);
                this.loadImageToCanvas(imgUrl, canvasId);
            }
        }, false);
    }

    onVideoCanPlay() {
        if (this.onCameraStartedCallback) {
            this.onCameraStartedCallback(this.stream, this.video);
        }
    }

    startCamera(resolution, callback, videoId) {
        const constraints = {
            'qvga': {width: {exact: 320}, height: {exact: 240}},
            'vga': {width: {exact: 640}, height: {exact: 480}}};
        let video = document.getElementById(videoId);
        if (!video) {
            video = document.createElement('video');
        }

        let videoConstraint = constraints[resolution];
        if (!videoConstraint) {
            videoConstraint = true;
        }

        navigator.mediaDevices.getUserMedia({video: videoConstraint, audio: false})
            .then(function(stream) {
                video.srcObject = stream;
                video.play();
                this.video = video;
                this.stream = stream;
                this.onCameraStartedCallback = callback;
                video.addEventListener('canplay', this.onVideoCanPlay, false);
            })
            .catch(function(err) {
                this.printError('Camera Error: ' + err.name + ' ' + err.message);
            });
    }

    stopCamera() {
        if (this.video) {
            this.video.pause();
            this.video.srcObject = null;
            this.video.removeEventListener('canplay', this.onVideoCanPlay);
        }
        if (this.stream) {
            this.stream.getVideoTracks()[0].stop();
        }
    }
}

export default Utils;

<template>
  <div id="BeeCanvas">
    <h1>{{ openCVReady ? "OpenCV ready" : "OpenCV not ready"}}</h1>
    <h2>Classifier: {{ class_url }}</h2>
    <div id="mediaDiv">
      <label>Video source</label>
      <input type="file" id="videoUp" name="file" @change="handleFileChange($event)"/>
      <video v-bind:class="{ inactive: streaming }" id="videoInput" ref="video" width="640" height="480" @change="resizeVideo" muted></video>
      <canvas v-bind:class="{ inactive: !streaming }" id="canvasOutput"></canvas>
    </div>
    <button v-if="openCVReady" v-on:click="videoPlayPause" v-on:ended="videoEnd">{{!streaming ? "Play Video" : "Stop Video"}}</button>
    <!--<div>
      <label>Upload different XML Classifier</label>
      <input type="file" id="xmlInput" name="xml" @change="$emit('xml_upload', $event)"/>
    </div>-->
  </div>
</template>

<script>
import BeeDetect from '../BeeDetect'
export default {
  name: 'BeeCanvas',
  props: {
    openCVReady: Boolean, 
    class_url: String,
  },
  mounted() {
      this.video = this.$refs.video;
      this.video.src = "./rpi12_bees.mp4";
  },
  methods: {
    handleFileChange(e) {
      let src = URL.createObjectURL(e.target.files[0]);
      this.video.src = src; 
    },
    resizeVideo() {
        this.video.height = this.video.width * (this.video.videoHeight / this.video.videoWidth);
    },
    videoPlayPause() {
        if (!this.streaming) {
          this.bee_detector = new BeeDetect(this.video, "canvasOutput", this.class_url);
          this.streaming = true;
          this.video.play().then(() => {
              this.bee_detector.startDetect();
          });
        }
        else {
          this.video.pause();
          this.video.currentTime = 0;
          this.videoEnd();
        }
    },
    videoEnd() {
      this.streaming = false;
      this.bee_detector.stopDetect();
    }
  },
  data: function() {
    return {
      video: null,
      streaming: false,
      bee_detector : null,
    };
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#BeeCanvas {
  max-width: 650px;
  margin: 0 auto 0 auto;
}
button, input {
  margin: 5px;
}
.inactive {
  display: none;
}
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>

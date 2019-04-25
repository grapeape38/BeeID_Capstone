<template>
  <div id="BeeCanvas">
    <h2>Status: {{status}}</h2>
    <label>XML Cascade Classifier: </label>
    <select v-on:change="switchXML" id="xmlSelect" ref="xmlSelect">
      <option v-for="xml in xmlList" v-bind:key="xml">{{xml}}</option>
    </select>
    <div id="mediaDiv">
      <label>Video source: </label>
      <input type="file" id="videoUp" name="file" @change="handleFileChange($event)"/>
      <label v-if="!streaming">Go: </label>
      <span id="playDiv" v-if="status==='Ready'" v-on:click="videoPlayPause">
        <i v-if="!streaming" class="fa fa-play fa-2x"></i>
        <i v-else class="fa fa-stop fa-2x"></i>
      </span>
      <video v-bind:class="{ inactive: streaming }" v-bind:src="vidSrc" v-on:ended="videoEnd" id="videoInput" ref="video" width="640" height="480" @change="resizeVideo" muted></video>
      <canvas v-bind:class="{ inactive: !streaming }" id="canvasOutput"></canvas>
    </div>
    <!--<button v-if="status==='Ready'" v-on:click="videoPlayPause" v-on:ended="videoEnd">{{!streaming ? "Start Detection" : "Stop Video"}}</button>-->
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
    status: String,
    vidURL: String,
    beeList: Array 
  },
  mounted() {
      this.video = this.$refs.video;
  },
  methods: {
    handleFileChange(e) {
      this.videoEnd();
      this.vidSrc = URL.createObjectURL(e.target.files[0]);
    },
    switchXML() {
      this.class_url = this.$refs.xmlSelect.value;
      this.$emit('switchXML', this.class_url)
    },
    resizeVideo() {
        this.video.height = this.video.width * (this.video.videoHeight / this.video.videoWidth);
    },
    addBee(bee) {
      this.beeList.push(bee);
    },
    videoPlayPause() {
        if (!this.streaming) {
          this.$emit('clearBees');
          this.bee_detector = new BeeDetect(this.video, "canvasOutput", this.class_url, this.addBee);
          this.bee_detector.startDetect();
        }
        else {
          this.videoEnd();
        }
    },
    videoEnd() {
      if (this.bee_detector) {
        this.bee_detector.stopDetect();
      }
    }
  },
  watch: {
    vidURL: function(newVal, oldVal) {
      this.videoEnd();
      this.vidSrc = newVal;
    }
  },
  computed: {
    streaming: function() {
      return this.bee_detector !== null && this.bee_detector.streaming;
    }
  },
  data: function() {
    return {
      video: null,
      //vidSrc: "videos/rpi12b@2018-06-17@11-10-33.mp4",
      vidSrc: "videos/rpi12b_2018-07-15_11-45-49.mp4",
      class_url: "rpi11b.xml",
      xmlList: ["rpi11b.xml", "rpi12b.xml", "rpi24.xml", "class2.xml","class3.xml"],
      bee_detector : null,
    };
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#BeeCanvas {
  max-width: 650px;
  float:left;
}
button, input {
  margin: 5px;
}
#playDiv:hover {
  cursor: pointer;
}
#playDiv {
  margin-left: 5px;
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

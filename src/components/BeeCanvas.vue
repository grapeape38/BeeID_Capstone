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
      <!--<video v-bind:class="{ inactive: streaming }" v-bind:src="vidURL" v-on:ended="videoEnd" id="videoInput" ref="video" width="640" height="480" @change="resizeVideo" muted></video>-->
      <video v-bind:class="{ inactive: streaming }" v-bind:src="vidURL" v-on:ended="videoEnd" id="videoInput" ref="video" @change="resizeVideo" muted></video>
      <canvas v-bind:class="{ inactive: !streaming }" id="canvasOutput"></canvas>
    </div>
    </div>
</template>

<script>
import BeeDetect from '../BeeDetect'
export default {
  name: 'BeeCanvas',
  props: {
    status: String,
    vidURL: String,
    streaming: Boolean,
  },
  mounted() {
      this.video = this.$refs.video;
      //this.video.width = this.video.clientWidth;
      //this.video.height = this.video.clientHeight;
      //this.video.height = this.video.width * (this.video.videoHeight / this.video.videoWidth);
  },
  methods: {
    handleFileChange(e) {
      let url = URL.createObjectURL(e.target.files[0]);
      this.$emit('loadVideo', url)
    },
    switchXML() {
      this.videoEnd();
      let class_url = this.$refs.xmlSelect.value;
      this.$emit('switchXML', class_url)
    },
    resizeVideo() {
      this.video.height = this.video.width * (this.video.videoHeight / this.video.videoWidth);
    },
    videoPlayPause() {
      if (!this.streaming) {
        this.video.width = this.video.clientWidth;
        this.resizeVideo();
      }
      this.$emit('videoPlayPause');
    },
    videoEnd() {
      this.$emit('videoEnd');
    }
  },
  data: function() {
    return {
      video: null,
      xmlList: ["rpi11b.xml", "rpi12b.xml", "rpi24.xml", "class2.xml","class3.xml"],
    };
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#videoInput {
  width:100%;
}
#BeeCanvas {
  /*max-width: 650px;*/
  width: 50%;
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

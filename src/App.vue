<template>
  <div id="app">
    <h2>BeeID</h2>
    <div>
    <h3>Made as part of the <a href="http://cs.appstate.edu:8080/">Beemon Project</a></h3>
    <a href="https://github.com/grapeape38/BeeID_Capstone"><img src="GitHub-Mark-32px.png"/></a>
    </div>
    <div id="leftDiv">
      <VideoSelect
        v-bind:videoList="videoList"
        v-on:loadVideo="loadVideo($event)"/>
      <!--<Params v-model="params"/>-->
    </div>
    <BeeCanvas
      v-bind:vidURL="vidURL"
      v-bind:status="status"
      v-bind:streaming="beeDetect.streaming"
      v-on:videoPlayPause="videoPlayPause"
      v-on:videoEnd="videoEnd"
      v-on:loadVideo="loadVideo($event)"
      />
    <BeeArchive
      v-bind:beeList="beeDetect.beeList"/>
  </div>
</template>

<script>
import BeeCanvas from './components/BeeCanvas.vue'
import BeeArchive from './components/BeeArchive.vue'
//import Params from './components/Params.vue'
import BeeDetect from './BeeDetect.js'
import VideoSelect from './components/VideoSelect.vue'

const [video_id, canvas_id] = ["videoInput", "canvasOutput"];

export default {
  name: 'app',
  components: {
   BeeCanvas,
   BeeArchive,
   VideoSelect,
   //Params
  },
  mounted() {
      let f = 'rpi11b.xml'; 
      this.$utils.loadOpenCv()
        .then(() => this.loadXML(f));

      fetch('/getVideos').then((resp) => {
        return resp.json();
      }).then((json) => {this.videoList = json.videos})
        .catch(console.log("Error fetching videos"))
  },
  methods: {
    loadVideo(vidURL) {
      this.clearBees();
      this.videoEnd();
      this.vidURL = vidURL;
    },
    videoPlayPause() {
      if (!this.beeDetect.streaming) {
        this.clearBees();
        this.beeDetect.startDetect();
      }
      else {
        this.videoEnd();
      }
    },
    videoEnd() {
      if (this.beeDetect.streaming) {
        this.beeDetect.stopDetect();
      }
    },
    loadXML(class_url) {
      this.beeDetect.classFile = class_url;
      this.status = "XML Loading..."
      let url = '/classifiers/' + class_url;
      this.$utils.createFileFromUrl(class_url, url).then(() => {
        this.status = "Ready";
      })
    },
    /*downloadBees() {
      if (!this.beeList.length) return;
      let zip = new AdmZip(this.vidURL + ".zip");
      this.beeList.forEach(b => {
        let canvas_id = "bee_img_" + b.id;
        let canvas = document.getElementById(canvas_id)
        if (canvas !== undefined) {
          let ctx = canvas.getContext("2d");
          let img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          zip.addFile(canvas_id, img.data.buffer, canvas_id);
        }
      });
      console.log(zip.getEntries());
    },*/
    clearBees() {
      this.beeDetect.clearBees();
    }
  },
  data: function() {
    return { status: "OpenCV Loading...",
             videoList: [],
             beeDetect: new BeeDetect(video_id, canvas_id, "rpi11b.xml"),
             vidURL: "videos/rpi12b_2018-07-15_11-45-49.mp4" }
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0 auto 0 auto;
  width: 80%;
}
#leftDiv {
  width: 20%;
  float: left;
}
</style>

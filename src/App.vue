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
      <!--<Params v-bind:params="params"/>-->
    </div>
    <BeeCanvas
      v-on:xml_upload="uploadXML($event)"
      v-on:switchXML="switchXML($event)"
      v-bind:vidURL="vidURL"
      v-bind:status="status"
      v-bind:beeList="beeList"
      v-on:clearBees="clearBees"/>
    <BeeArchive v-bind:beeList="beeList" />
  </div>
</template>

<script>
import BeeCanvas from './components/BeeCanvas.vue'
import BeeArchive from './components/BeeArchive.vue'
//import Params from './components/Params.vue'
import VideoSelect from './components/VideoSelect.vue'

export default {
  name: 'app',
  components: {
   BeeCanvas,
   BeeArchive,
   VideoSelect,
   //Params
  },
  mounted() {
      let xmlFile = 'rpi11b.xml';
      let url = 'classifiers/' + xmlFile;
      this.$utils.loadOpenCv()
        .then(() => {
          this.$utils.createFileFromUrl(xmlFile, url);
          this.status = "XML Loading...";
      }).then(() => {
          this.status = "Ready";
      })
      fetch('/getVideos').then((resp) => {
        return resp.json();
      }).then((json) => {this.videoList = json.videos})
        .catch(console.log("Error fetching videos"))
  },
  methods: {
    loadVideo(vidURL) {
      this.clearBees();
      this.vidURL = vidURL;
    },
    uploadXML(e) {
      let xmlFile = e.target.files[0];
      let url = URL.createObjectURL(xmlFile);
      this.status = "XML Loading..."
      this.$utils.createFileFromUrl(xmlFile.name, url).then(() => {
        this.status = "Ready";
      });
    },
    switchXML(class_url) {
      this.status = "XML Loading..."
      let url = '/classifiers/' + class_url;
      this.$utils.createFileFromUrl(class_url, url).then(() => {
        this.status = "Ready";
      })
    },
    setParam(key, val) {
      this.params.key = val;
    },
    clearBees() {
      this.beeList = [];
    }
  },
  data: function() {
    return { status: "OpenCV Loading...", vidURL: "", videoList: [], beeList: []/*, params: new HyperParams()*/}
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

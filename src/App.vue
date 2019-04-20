<template>
  <div id="app">
    <BeeCanvas v-on:xml_upload="uploadXML($event)" v-bind:openCVReady="openCVReady" v-bind:class_url="class_url"/>
  </div>
</template>

<script>
import BeeCanvas from './components/BeeCanvas.vue'

export default {
  name: 'app',
  components: {
   BeeCanvas
  },
  mounted() {
      let xmlFile = './rpi11b.xml';
      this.$utils.loadOpenCv()
        .then(() => {
          this.$utils.createFileFromUrl(xmlFile, xmlFile);
          this.openCVReady = true;
      }).then(() => {
          this.class_url = xmlFile;
      })
    },
  methods: {
    uploadXML(e) {
      let xmlFile = e.target.files[0];
      let url = URL.createObjectURL(xmlFile);
      this.$utils.createFileFromUrl(xmlFile.name, url).then(() => {
        this.class_url = xmlFile.name;
      });
    }
  },
  data: function() {
    return { openCVReady: false, class_url: ""}
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
  margin-top: 60px;
}
</style>

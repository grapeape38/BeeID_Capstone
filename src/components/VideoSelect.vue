<template>
<div id="videoSelect">
    <h2>Sample Videos</h2>
    <div id="videoGrid">
        <span
            v-for="video in videoList" v-bind:key="video.id"
            v-on:click="selectVid(video.id, video.url)"
            class="videoThumb">
            <img v-bind:class="{ active: video.id === selected }"
                 v-bind:src="video.thumb"/>
        </span>
    </div>
</div>
</template>

<script>
export default {
    name: "VideoGrid",
    props: {
        videoList: Array 
    },
    methods: {
        selectVid: function(id, videoURL) {
            this.selected = id;
            this.$emit('loadVideo', videoURL);
        }
    },
    data: 
        function() {
            return { selected: -1 };
        }
}
</script>

<style>
/*#videoSelect {
    width: 20%;
    float:left;
}*/
#videoGrid {
    display:grid;
    grid-template-columns: 1fr 1fr;
}
.videoThumb:hover {
    cursor: pointer;
}
.active {
    border-style: solid;
    border-width: 3px;
    border-color: blue;
}
</style>
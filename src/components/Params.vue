<template>
<div id="paramsDiv">
    <div id="cascadeParams">
        <label>Min Size</label>
        <input type="text"/>
        <label>Max Size</label>
        <input type="text"/>
    </div>
    <div id="featureParams">
        <label>Max Corners</label>
        <input type="text"/>
        <label>Quality Level</label>
        <input type="text"/>
        <label>Minimum Distance</label>
        <input type="text"/>
        <label>Block Size</label>
        <input type="text"/>
    </div>
    <div id="optFlowParams">
        <label>Window Size</label>
        <input type="text"/>
        <label>Max Level</label>
        <input type="text"/>
        <label>Block Size</label>
        <input type="text"/>
        <label>Max Iterations</label>
        <input type="text"/>
        <label>Min Epsilon</label>
        <input type="text"/>
    </div>
<div> 
</template>


<script>
/*
this.MAX_INACTIVE_FRAMES = 10;
this.MIN_TRACK_PCT = 0.3;
this.DETECT_INTERVAL = 6;
this.MIN_ARCHIVE_FRAMES = 40;
this.MAX_DIST_SAME = 40;

this.cascade = {
    minsize: new cv.Size(30, 30),
    maxsize:  new cv.Size(200,200)
};
this.featureDetector = {
    maxCorners: 150, 
    qualityLevel: 0.3,
    minDistance: 7,
    blockSize: 3
};
this.optFlow = {
    winSize: new cv.Size(15,15),
    maxLevel: 2,
    criteria: new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.03)
}
*/
export default {
    name: 'Params',
    props: {
        params: Object 
    },
    methods: {
        updateParams: function(value) {
            this.$emit('input', value);
        },
    }
}
</script>
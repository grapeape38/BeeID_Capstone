<template>
    <li>
       <canvas width="80px" height="80px" v-bind:id="'thumb_' + bee.id"/>
    </li>
</template>

<script>
export default {
    name: "Bee",
    props: {
        bee: Object
    },
    mounted() {
        cv.imshow(this.canvas_id, this.bee.snapshot);
    },
    data: function() {
        return { canvas_id: 'thumb_' + this.bee.id };
    }
}
</script>
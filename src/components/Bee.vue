<template>
    <li>
       <canvas v-on:mouseover="mouseOver" 
               v-on:click="setFocus"
               v-on:mouseout="mouseOut"
               v-bind:style="styleObj"
               width="80px" height="80px" v-bind:id="'bee_img_' + bee.id"/>
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
        this.bee.destroy();
    },
    methods: {
        setFocus() {
            this.bee.setFocus();
        },
        mouseOver() {
            this.styleObj.borderWidth = '4px';
        },
        mouseOut() {
            this.styleObj.borderWidth = '0px';
        }
    },
    data: function() {
        return { canvas_id: 'bee_img_' + this.bee.id,
                 styleObj: {
                     borderColor: `rgb(${this.bee.color[0]}, ${this.bee.color[1]}, ${this.bee.color[2]})`,
                     borderStyle: 'solid',
                     borderWidth: '0px'
                 }
               };
    }
}
</script>

<style scoped>
li:hover {
    cursor: pointer;
}
</style>
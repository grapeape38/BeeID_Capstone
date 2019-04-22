<template>
    <div id="beeArchive">
        <h2>Bee Archive:</h2>
        <ul id="beeGrid">
            <Bee v-for="bee in beeList" 
                v-bind:key="bee.id"
                v-bind:bee="bee"/>
        </ul>
    </div>
</template>

<script>
import Bee from './Bee.vue'
export default {
    name: 'BeeArchive',
    components: {
        Bee
    },
    props: {
        beeList: Array 
    }
}
</script>

<style>
#beeArchive {
    width: 25%;
    float: right;
}
#beeGrid {
    list-style-type: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow-y: scroll;
    max-height: 70%;
}
</style>
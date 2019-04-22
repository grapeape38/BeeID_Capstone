<template>
    <div id="beeArchiveDiv">
        <h2>Bee Archive</h2>
        <h3>Select a bee to watch it in action</h3>
        <div id="beeDiv">
            <ul id="beeGrid">
                <Bee v-for="bee in beeList" 
                    v-bind:key="bee.id"
                    v-bind:bee="bee"/>
            </ul>
        </div>
    </div>
</template>

<script>
import Bee from './Bee.vue'
export default {
    name: 'BeeArchive',
    components: {
        Bee
    },
    watch: {
        beeList: function() {
            let beeDiv = document.getElementById('beeDiv');
            beeDiv.scrollTop = beeDiv.scrollHeight;
        }
    },
    props: {
        beeList: Array 
    }
}
</script>

<style>
#beeArchiveDiv {
    width: 25%;
    float: left;
}
#beeDiv {
    min-height:500px;
    max-height:500px;
    overflow-y: scroll;
}
#beeGrid {
    list-style-type: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
}
</style>
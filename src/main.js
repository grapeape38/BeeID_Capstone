import Vue from 'vue'
import App from './App.vue'
import Utils from './utils'

Vue.prototype.$utils = new Utils();

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')

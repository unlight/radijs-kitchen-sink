import { mount } from 'radi';

function render() {
    const { App } = require('./app/app');
    mount(new App(), document.getElementById('app'));
}

render();

// Hot Module Replacement API.
// if (module.hot) {
//     module.hot.accept('./app/app', render);
// }

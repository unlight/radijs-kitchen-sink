/** @jsx r **/
const { r, component } = require('radi');

export const App = component({
    view: function() {
        const { Counter } = require('./counter');
        return <Counter />;
    },
});

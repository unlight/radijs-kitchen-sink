const { r, l, mount, component } = require('radi');

export const Counter = component({
    view: function() {
        return (
            <div id="app">
                <div class="counter">
                    {l(this.counter)}
                </div>
                <div class="buttons">
                    <button onclick={this.down}
                        disabled={l(this.counter <= 0)}>-</button>
                    <button onclick={this.up}>+</button>
                </div>
            </div>
        )
    },
    state: {
        counter: 0
    },
    actions: {
        up() {
            this.counter += 1;
        },
        down() {
            this.counter -= 1;
        }
    }
});

const block = name => document.querySelector(name)
const fmt = val => formatNumber(+val, 0, 3, "'", ".")
const money = val => formatNumber(+val, 4, 3, "'", ".")

const updatePrice = (data) => {
    const {current_price, price_change_24h, high_24h} = data
    block('#mina-price').innerHTML = `${money(current_price)}`
    block('#mina-price-change-24h').innerHTML = `${money(price_change_24h)}`
    block('#mina-price-high-24h').innerHTML = `${money(high_24h)}`
}

const updateEpoch = (data) => {
    const {epoch, global_slot, blocks_produced, epoch_start_block, slot} = data
    block("#epoch").innerHTML = fmt(epoch)
    block("#global-slot").innerHTML = fmt(global_slot)
    block("#slot").innerHTML = fmt(slot)
    block("#start-block").innerHTML = fmt(epoch_start_block)
    block("#blocks-produced").innerHTML = fmt(blocks_produced)
    block(".bar").style.width = `${Math.round(slot * 100 / 7140)}%`
}

const updateBlock = (data) => {
    const {coinbase, slot, global_slot, timestamp, creator_key, height} = data
    block("#height").innerHTML = fmt(height)
    block("#block-coinbase").innerHTML = fmt(coinbase/10**9)
    block("#block-slot").innerHTML = fmt(slot)
    block("#block-global-slot").innerHTML = fmt(global_slot)
    block("#creator").innerHTML = `<a class="mi__link" href="https://minataur.net/address/${creator_key}">${shorten(creator_key, 10)}</a>`
    block("#block-time").innerHTML = `${datetime(+timestamp).format('DD, MMM HH:mm')}`
}


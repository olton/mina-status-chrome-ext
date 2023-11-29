const shorten = (v, l) => `${v.substring(0, l) + '...' + v.substring(v.length - l)}`

const formatNumber = function(num, decimalLength, wholeLength, thousandDivider, decimalDivider) {
    const re = '\\d(?=(\\d{' + (wholeLength || 3) + '})+' + (decimalLength > 0 ? '\\D' : '$') + ')',
        _num = num.toFixed(Math.max(0, ~~decimalLength));

    return (decimalDivider ? _num.replace('.', decimalDivider) : _num).replace(new RegExp(re, 'g'), '$&' + (thousandDivider || ','));
}
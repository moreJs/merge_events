"use strict";
// 数组去重
function distinct(arr) {
    var ret = [], json = {}, length = arr.length;
    for (var i = 0; i < length; i++) {
        var val = arr[i];
        if (!json[val]) {
            json[val] = 1;
            ret.push(val);
        }
    }
    return ret;
}
exports.distinct = distinct;
//# sourceMappingURL=util.js.map
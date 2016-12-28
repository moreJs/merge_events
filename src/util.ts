// 每个event的标准callback对象
export interface EmitCbObj{
    uid: string;
    success: () => any;
    error: () => any;
}

export interface Profile{
    uid: string,
    nick: string,
    age: number
}

// 数组去重
export function distinct(arr) {
    var ret = [],
        json = {},
        length = arr.length;
        
    for(var i = 0; i < length; i++){
        var val = arr[i];
        if(!json[val]){
            json[val] = 1;
            ret.push(val);
        }
    }
    return ret;
}
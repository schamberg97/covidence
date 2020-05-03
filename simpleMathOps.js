module.exports = {
	difference,
	guid,
	allEqual,
};

function difference (a, b) { 
	return Math.abs(a - b); 
}

function allEqual (arr, val) {
	if (val) {
		return arr.every( v => v === arr[0] && v === val )
	}
	else {
		return arr.every( v => v === arr[0] )
	}
}

function guid(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);});}



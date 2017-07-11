/**
 * @author Peter Soetens - peter@pickit3d.com
 * @author Viktor Kunovski - viktor@pickit3d.com
 */

ROS3D.BIG_ENDIAN = 0;
ROS3D.LITTLE_ENDIAN = 1;

ROS3D.BufferView = function(options) {
  options = options || {};

  this.endian = options.endian || ROS3D.BIG_ENDIAN;
  this.type = options.type || 'base64';

  var data = options.data || '';

  this.view = new DataView(this.base64ToArrayBuffer(data));

  this.offset = 0;
  this.singlePointOffset = 0;
};

ROS3D.BufferView.prototype.readFloat32 = function() {
  var value = this.view.getFloat32(this.offset, !!this.endian);
  this.offset += 4;
  this.singlePointOffset += 4;
  return value;
};

ROS3D.BufferView.prototype.readUint8 = function() {
  var value = this.view.getUint8(this.offset);
  this.offset += 1;
  this.singlePointOffset += 1;
  return value;
};

ROS3D.BufferView.prototype.incrementOffset = function(offset) {
  this.offset += +offset;
  this.singlePointOffset += +offset;
};

ROS3D.BufferView.prototype.resetSinglePointOffset = function() {
  this.singlePointOffset = 0;
};

ROS3D.BufferView.prototype.base64ToArrayBuffer = function(base64) {
  var binaryString = window.atob(base64);
  var len = binaryString.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

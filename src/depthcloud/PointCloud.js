/**
 * @author Julius Kammerl - jkammerl@willowgarage.com
 * @author Peter Soetens - peter@thesourceworks.com
 */

/**
 * The PointCloud object. Allows you to visualise PointCloud2 messages.
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * topic - the topic to subscribe to for PointCloud2 messages
 *   * pointSize (optional) - point size (pixels) for rendered point cloud
 *   * width (optional) - width of the video stream
 *   * height (optional) - height of the video stream
 *   * whiteness (optional) - blends rgb values to white (0..100)
 */
ROS3D.PointCloud = function(options) {
  options = options || {};

  this.topic = options.topic;
  this.pointSize = options.pointSize || 3;
  this.width = options.width || 640;
  this.height = options.height || 480;
  this.whiteness = options.whiteness || 0;
  this.queue_length = options.queue_length || 0;
  this.opacity = options.opacity || 1;
  this.transparent = options.transparent || false;

  var ros = options.ros;
  var topic = options.topic;

  var positions = new Float32Array(this.width * this.height * 3);
  var colors = new Float32Array(this.width * this.height * 3);

  this.geometry = new THREE.BufferGeometry();

  this.geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
  this.geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

  this.mesh = new THREE.PointCloud(
    this.geometry,
    new THREE.PointCloudMaterial({
      size: this.pointSize / 1000.0,
      opacity: this.opacity,
      transparent: this.transparent,
      vertexColors: THREE.VertexColors
    })
  );

  // If we don't clear this, the point cloud gets undrawn when we get too close with the camera,
  // even if it doesn't seem close.
  this.mesh.frustumCulled = false;

  // subscribe to the topic
  this.rosTopic = new ROSLIB.Topic({
    ros : ros,
    name : topic,
    messageType : 'sensor_msgs/PointCloud2',
    compression : 'png',
    queue_length  : this.queue_length,
    throttle_rate : 500
  });

};

/**
 * Start video playback
 * @todo: move this code + coloring of the point cloud into a vertex+fragment shader.
 * The message.data is a base64 encoded string, but also internally an Image object.
 * Maybe the image can be passed to the vertex shader and decoded there, which would
 * help in speeding up : receiving as png and no longer decompressing in javascript.
 */
ROS3D.PointCloud.prototype.startStream = function() {
  var that = this,
      position = that.geometry.attributes.position.array,
      color    = that.geometry.attributes.color.array;

  this.rosTopic.subscribe(function(message) {
    var bufferView = new ROS3D.BufferView({
      data: message.data,
      type: 'base64',
      endian: ROS3D.LITTLE_ENDIAN
    });
    var l = message.width * message.height, i = 0, i3 = 0;

    // Guard against empty pointcloud (zero points: zero message width or height).
    if (l === 0) {
      return;
    }

    for (; i < that.width * that.height; i++, i3 += 3) {

      if ( i < l ) {
        bufferView.resetSinglePointOffset();

        position[i3]     = bufferView.readFloat32();
        position[i3 + 1] = bufferView.readFloat32();
        position[i3 + 2] = bufferView.readFloat32();
        bufferView.incrementOffset(4); // skip empty channel

        switch (message.point_step) {
          // message contains normals; colors are in the third channel
          case 48:
            bufferView.incrementOffset(16);
            /* falls through */
          case 32:
            color[i3 + 2] = bufferView.readUint8() / 255.0; // B
            color[i3 + 1] = bufferView.readUint8() / 255.0; // G
            color[i3]     = bufferView.readUint8() / 255.0; // R
            break;
          // 16-byte point step messages don't have colors
          case 16:
            /* falls through */
          default:
        }

        // adjust offset for the next point
        bufferView.incrementOffset(message.point_step - bufferView.singlePointOffset);
      } else {
        // Converge all other points which should be invisible into the "last" point of the
        // "visible" cloud (effectively reset)
        position[i3]     = position[i3 - 3].x;
        position[i3 + 1] = position[i3 - 2].y;
        position[i3 + 2] = position[i3 - 1].z;
      }
    }
    that.geometry.attributes.position.needsUpdate = true;
    that.geometry.attributes.color.needsUpdate = true;
  });
};

/**
 * Stop video playback
 */
ROS3D.PointCloud.prototype.stopStream = function() {
    this.rosTopic.unsubscribe();
};

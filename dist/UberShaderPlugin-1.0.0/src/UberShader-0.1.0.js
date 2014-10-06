/*
 * Declare plugin
 */

Kiwi.Plugins.UberShader = {
  
  name:'UberShader',

  version:'0.1.0',

  minimumKiwiVersion:'1.1.0',

  pluginDependencies: [
  {
    name:"MultiTexture",
    minimumVersion:'1.0.0'
  }
    
  ]

};
Kiwi.PluginManager.register(Kiwi.Plugins.UberShader);




/*
 * Uber Shader Renderer
 */

Kiwi.Renderers.UberShaderRenderer = function( gl, shaderManager, params ) {
  // Perform super functionality
  Kiwi.Renderers.TextureAtlasRenderer.call( this, gl, shaderManager, params );

  // Custom functionality

  this.setShaderPair( "UberShader" );

  // Override default buffer configuration
  var bufferItemSize = 11;
  this._vertexBuffer = new Kiwi.Renderers.GLArrayBuffer(gl, bufferItemSize);

  // Internal data
  this.game = null;
  this.numLights = 8;
  this.maxExponent = 512.0;
  this.stageTransform = {
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1
  };

  // Create lights
  this.lights = [];
  for( var i = 0;  i < this.numLights;  i++ ) {
    var light = {
      lightVector: [0, 0, 0],
      lightColor: [1.0,1.0,1.0],
      lightIntensity: 0,
      lightFalloff: 2
    };
    this.lights.push(light);
  }
}
// Extend renderer
Kiwi.extend( Kiwi.Renderers.UberShaderRenderer, Kiwi.Renderers.TextureAtlasRenderer );

Kiwi.Renderers.UberShaderRenderer.prototype.enable = function( gl, params ) {

  // Entirely custom functionality

  this.shaderPair = this.shaderManager.requestShader(gl, this._shaderPairName, true);

  //Texture
  gl.uniform1i(this.shaderPair.uniforms.uSamplerDiff.location, 0);
  gl.uniform1i(this.shaderPair.uniforms.uSamplerNorm.location, 1);
  gl.uniform1i(this.shaderPair.uniforms.uSamplerSpec.location, 2);


  // Stage transformation updates in case of viewport resize
  if(this.game !== null) {
    if(this.game.deviceTargetOption == Kiwi.TARGET_COCOON) {
      // Determine necessary stage transformation
      // (Copypaste from GLRenderManager)
      var offset = new Kiwi.Geom.Point(0, 0);
      var width = window.innerWidth;
      var height = window.innerHeight;
      switch( this.game.stage.scaleType ) {
          case Kiwi.Stage.SCALE_FIT:
              // Compute aspect ratios
              var arStage = this.game.stage.width / this.game.stage.height;
              var arSpace = width / height;
              if(arStage < arSpace) {
                  // Width is too wide
                  var newWidth = height * arStage;
                  offset.x = (width - newWidth) / 2;
                  // Compress target space
                  width = newWidth;
              }
              else {
                  // Height is too wide
                  var newHeight = width / arStage;
                  offset.y = (height - newHeight) / 2;
                  // Compress target space
                  height = newHeight;
              }
              break;
          case Kiwi.Stage.SCALE_STRETCH:
              break;
          case Kiwi.Stage.SCALE_NONE:
              width = this._game.stage.width;
              height = this._game.stage.height;
              break;
          default:
              break;
      }
      // Set stage transform parameters
      this.stageTransform.offsetX = offset.x;
      this.stageTransform.offsetY = offset.y;
      this.stageTransform.scaleX = this.game.stage.width / width;
      this.stageTransform.scaleY = this.game.stage.height / height;
    }
  }
  var stageTransformArray = new Float32Array( [
      this.stageTransform.scaleX,
      this.stageTransform.scaleY,
      1.0
      ] );
  gl.uniform3fv(this.shaderPair.uniforms.uStageScaler.location, stageTransformArray );


  // Lights
  gl.uniform1f(this.shaderPair.uniforms.uMaxExponent.location, this.maxExponent);
  var lightVectorArray = [];
  var lightColorArray = [];
  // Prepare inverse coordinates (with a guess if the renderer has no game object attached)
  var yOffset = this.game !== null  ?
    600  :
    this.game.stage.height;
  for( var i = 0;  i < this.lights.length;  i++ ) {
    // Pack light vector, including falloff exponent
    lightVectorArray.push(this.stageTransform.offsetX + this.lights[i].lightVector[0] / this.stageTransform.scaleX);
    lightVectorArray.push( this.stageTransform.offsetY + (yOffset - this.lights[i].lightVector[1]) / this.stageTransform.scaleY);
    lightVectorArray.push(this.lights[i].lightVector[2]);
    lightVectorArray.push(this.lights[i].lightFalloff);
    // Pack light color, including intensity parameter
    lightColorArray.push(this.lights[i].lightColor[0]);
    lightColorArray.push(this.lights[i].lightColor[1]);
    lightColorArray.push(this.lights[i].lightColor[2]);
    lightColorArray.push(this.lights[i].lightIntensity);
  }
  gl.uniform4fv(this.shaderPair.uniforms.uLightVector.location, new Float32Array( lightVectorArray ) );
  gl.uniform4fv(this.shaderPair.uniforms.uLightCol.location, new Float32Array( lightColorArray ));

  

  //Other uniforms
  gl.uniform2fv(this.shaderPair.uniforms.uResolution.location, params.stageResolution);
  gl.uniformMatrix3fv(this.shaderPair.uniforms.uCamMatrix.location, false, params.camMatrix);
  
}

Kiwi.Renderers.UberShaderRenderer.prototype.addToBatch = function( gl, entity, camera ) {
  // Override normal batch creation process
  // We need some additional data in the attribute arrays

  // Boilerplate

  // Skip if it's invisible due to zero alpha
  if (entity.alpha <= 0)
      return;
  var t = entity.transform;
  var m = t.getConcatenatedMatrix();

  var cell = entity.atlas.cells[entity.cellIndex];

  var pt1 = new Kiwi.Geom.Point(0 - t.rotPointX, 0 - t.rotPointY);
  var pt2 = new Kiwi.Geom.Point(cell.w - t.rotPointX, 0 - t.rotPointY);
  var pt3 = new Kiwi.Geom.Point(cell.w - t.rotPointX, cell.h - t.rotPointY);
  var pt4 = new Kiwi.Geom.Point(0 - t.rotPointX, cell.h - t.rotPointY);

  pt1 = m.transformPoint(pt1);
  pt2 = m.transformPoint(pt2);
  pt3 = m.transformPoint(pt3);
  pt4 = m.transformPoint(pt4);

  // End boilerplate

  this._vertexBuffer.items.push(
    pt1.x, pt1.y, cell.x, cell.y, entity.alpha, m.tx, m.ty, m.a, m.b, m.c, m.d, 
    pt2.x, pt2.y, cell.x + cell.w, cell.y, entity.alpha, m.tx, m.ty, m.a, m.b, m.c, m.d, 
    pt3.x, pt3.y, cell.x + cell.w, cell.y + cell.h, entity.alpha, m.tx, m.ty, m.a, m.b, m.c, m.d, 
    pt4.x, pt4.y, cell.x, cell.y + cell.h, entity.alpha, m.tx, m.ty, m.a, m.b, m.c, m.d
    );
}

Kiwi.Renderers.UberShaderRenderer.prototype.draw = function (gl) {
  var bufferItemSize = 11;
  var bufferItemBufferSize = bufferItemSize * 4;
  var bufferItemStep = 0;

  this._vertexBuffer.uploadBuffer(gl, this._vertexBuffer.items);

  gl.enableVertexAttribArray(this.shaderPair.attributes.aXYUV);
  gl.vertexAttribPointer(this.shaderPair.attributes.aXYUV, 4, gl.FLOAT, false, bufferItemBufferSize, bufferItemStep * 4);
  bufferItemStep += 4;

  gl.enableVertexAttribArray(this.shaderPair.attributes.aAlphaMtXY);
  gl.vertexAttribPointer(this.shaderPair.attributes.aAlphaMtXY, 3, gl.FLOAT, false, bufferItemBufferSize, bufferItemStep * 4);
  bufferItemStep += 3;

  gl.enableVertexAttribArray(this.shaderPair.attributes.aMtABCD);
  gl.vertexAttribPointer(this.shaderPair.attributes.aMtABCD, 4, gl.FLOAT, false, bufferItemBufferSize, bufferItemStep * 4);
  bufferItemStep += 4;

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer.buffer);
  gl.drawElements(gl.TRIANGLES, (this._vertexBuffer.items.length / bufferItemBufferSize) * 6, gl.UNSIGNED_SHORT, 0);
};





/*
 * Uber Shader Pair
 */

Kiwi.Shaders.UberShader = function() {
  // Super call
  Kiwi.Shaders.TextureAtlasShader.call( this );


  // Extended functionality

  // Configure uniforms
  this.uniforms = {
    uCamMatrix: {
        type: "mat3"
    },
    uResolution: {
        type: "2fv"
    },
    uTextureSize: {
        type: "2fv"
    },
    uSamplerDiff: {
        type: "1i"
    },
    uSamplerNorm: {
        type: "1i"
    },
    uSamplerSpec: {
        type: "1i"
    },
    uLightVector: {
        type: "4fv"
    },
    uLightCol: {
        type: "4fv"
    },
    uMaxExponent: {
        type: "1f"
    },
    uStageScaler: {
        type: "3fv"
    }
  };

  // Configure shaders

  this.vertSource = [
    "precision highp float;",
    "attribute vec4 aXYUV;",
    "attribute vec3 aAlphaMtXY;",
    "attribute vec4 aMtABCD;",
    "uniform mat3 uCamMatrix;",
    "uniform vec2 uResolution;",
    "uniform vec2 uTextureSize;",
    "varying vec2 vTextureCoord;",
    "varying lowp float vAlpha;",
    "varying mat3 vSpriteTransform;",
    "void main(void) {",
    "  vec2 pos = (uCamMatrix * vec3(aXYUV.xy,1)).xy; ",
    "  gl_Position = vec4((pos / uResolution * 2.0 - 1.0) * vec2(1.0, -1.0), 0.0, 1.0);",
    "  vTextureCoord = aXYUV.zw / uTextureSize;",
    "  vAlpha = aAlphaMtXY.x;",
    "  vSpriteTransform = mat3(aMtABCD.x, aMtABCD.y, 0.0, aMtABCD.z, aMtABCD.w, 0.0, aAlphaMtXY.y, aAlphaMtXY.z, 1.0);",
    "}"
  ];

  this.fragSource = [
    "precision highp float;",
    // highp precision is necessary for many terms to produce nice lighting on mobile devices
    // consider upgrading mediump or lowp terms in the fragment shader if necessary
    "varying vec2 vTextureCoord;",
    "varying lowp float vAlpha;",
    "varying mat3 vSpriteTransform;",
    "uniform sampler2D uSamplerDiff;",
    "uniform sampler2D uSamplerNorm;",
    "uniform sampler2D uSamplerSpec;",
    "uniform vec4 uLightVector[8];",  // W component is falloff exponent
    "uniform vec4 uLightCol[8];", // W component is intensity
    "uniform vec3 uStageScaler;",  // XY is stage offset, Z is constant
    "uniform float uMaxExponent;",
    "/* Normal Map Constants */",
    "const vec3 eyeVec = vec3(0.0, 0.0, 1.0);",
    "void main(void) {",
    "  lowp vec4 col = texture2D(uSamplerDiff, vTextureCoord.xy);",
    "  lowp vec4 norm = texture2D(uSamplerNorm, vTextureCoord.xy) * 2.0 - 1.0;",
    "  lowp vec4 spec = texture2D(uSamplerSpec, vTextureCoord.xy);",
    "  mediump float normLength = length(norm.xy);",
    "  norm.xy = (vec3(norm.xy, 1.0) * vSpriteTransform).xy;",  // Transform XY normals to match object transformation; Z normal is unaffected on sprites
    "  norm.xy *= normLength / length(norm.xy);", // Restore original XY magnitude, which may be lost if object is scaled
    // Cumulative lighting
    "  lowp vec3 diffSum = vec3(0.0);",
    "  lowp vec3 specSum = vec3(0.0);",
    "  for(int i = 0; i < 8;  i++) {",
    // Obtain coordinate lighting data
    "    highp vec3 lightDir = (gl_FragCoord.xyz - uLightVector[i].xyz) * uStageScaler.xyz;", // Light has been converted to screen coordinates; scale compensator is required to pull back to root coordinate length
    "    lowp float lightIntensity = pow(uLightCol[i].w / length(lightDir), uLightVector[i].w);",
    "    lightDir = normalize(lightDir);",
    // Create reflection
    "    mediump vec3 reflectionDirection = reflect(lightDir, norm.xyz);",
    // Perform lighting
    "    lowp float diff = lightIntensity * max( dot( reflectionDirection, norm.xyz ), 0.0 );",
    "    lowp float specPower = max( dot( reflectionDirection, eyeVec ), 0.0 );",
    "    specPower = pow(specPower, spec.a * uMaxExponent) * lightIntensity;",
    // Accumulate light
    // Does not use "+=" terminology because it was verified to not compile on Samsung Galaxy Tab 3 using CocoonJS. The more verbose terminology seems more compatible.
    "    diffSum = diffSum + uLightCol[i].rgb * diff;",
    "    specSum = specSum + uLightCol[i].rgb * specPower;",
    "  }",
    "  gl_FragColor = vec4(col.rgb * diffSum + spec.rgb * specSum, col.a * vAlpha);",
    "}"
  ];

}
Kiwi.extend( Kiwi.Shaders.UberShader, Kiwi.Shaders.TextureAtlasShader );

Kiwi.Shaders.UberShader.prototype.init = function( gl ) {
  // Override default method

  // Super
  Kiwi.Shaders.ShaderPair.prototype.init.call(this, gl);

  // Redesigned attributes
  this.attributes.aXYUV = gl.getAttribLocation(this.shaderProgram, "aXYUV");
  this.attributes.aAlphaMtXY = gl.getAttribLocation(this.shaderProgram, "aAlphaMtXY");
  this.attributes.aMtABCD = gl.getAttribLocation(this.shaderProgram, "aMtABCD");
  
  this.initUniforms(gl);
}
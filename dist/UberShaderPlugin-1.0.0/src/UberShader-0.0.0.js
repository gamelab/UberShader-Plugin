/*
 * Declare plugin
 */

Kiwi.Plugins.UberShader = {
  
  name:'UberShader',

  version:'0.0.0',

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
  var bufferItemSize = 11;//5;
  this._vertexBuffer = new Kiwi.Renderers.GLArrayBuffer(gl, bufferItemSize);

  this.lightDir = [3, 2, 1];
  this.lightCol = [1.0,0.8,0.5];
  this.transform = null;
}
// Extend renderer
Kiwi.extend( Kiwi.Renderers.UberShaderRenderer, Kiwi.Renderers.TextureAtlasRenderer );

Kiwi.Renderers.UberShaderRenderer.prototype.enable = function( gl, params ) {

  // Entirely custom functionality

  this.shaderPair = this.shaderManager.requestShader(gl, this._shaderPairName, true);

  //Texture
  gl.uniform1i(this.shaderPair.uniforms.uSamplerDiff.location, 0);
  gl.uniform1i(this.shaderPair.uniforms.uSamplerNorm.location, 1);

  //Other uniforms
  gl.uniform2fv(this.shaderPair.uniforms.uResolution.location, params.stageResolution);
  gl.uniformMatrix3fv(this.shaderPair.uniforms.uCamMatrix.location, false, params.camMatrix);
  var lightDirection = new Float32Array( this.lightDir );
  gl.uniform3fv(this.shaderPair.uniforms.uLightDirection.location, lightDirection);
  gl.uniform3fv(this.shaderPair.uniforms.uLightCol.location, this.lightCol);
  // Create transform
  /*var m = this.transform.getConcatenatedMatrix();
  var matrix = [
    m.a, m.b, 0,
    m.c, m.d, 0,
    m.tx, m.ty, 1];
  gl.uniformMatrix3fv( this.shaderPair.uniforms.uSpriteTransform.location, false, matrix );*/
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
    uLightDirection: {
        type: "3fv"
    },
    uLightCol: {
        type: "3fv"
    }/*,
    uSpriteTransform: {
      type: "mat3"
    }*/
  };

  // Configure shaders

  this.vertSource = [
    "attribute vec4 aXYUV;",
    "attribute vec3 aAlphaMtXY;",
    "attribute vec4 aMtABCD;",
    "uniform mat3 uCamMatrix;",
    "uniform vec2 uResolution;",
    "uniform vec2 uTextureSize;",
    "uniform vec3 uLightDirection;",
    "varying vec2 vTextureCoord;",
    "varying float vAlpha;",
    "varying vec3 vInverseLightDirection;",
    "varying mat3 vSpriteTransform;",
    "void main(void) {",
    "  vec2 pos = (uCamMatrix * vec3(aXYUV.xy,1)).xy; ",
    "  gl_Position = vec4((pos / uResolution * 2.0 - 1.0) * vec2(1, -1), 0, 1);",
    "  vTextureCoord = aXYUV.zw / uTextureSize;",
    "  vAlpha = aAlphaMtXY.x;",
    "  vInverseLightDirection = -normalize(uLightDirection.xyz);",
    "  vSpriteTransform = mat3(aMtABCD.x, aMtABCD.y, 0, aMtABCD.z, aMtABCD.w, 0, aAlphaMtXY.y, aAlphaMtXY.z, 1);",
    "}"
  ];

  this.fragSource = [
    "precision mediump float;",
    "varying vec2 vTextureCoord;",
    "varying float vAlpha;",
    "varying vec3 vInverseLightDirection;",
    "varying mat3 vSpriteTransform;",
    "uniform sampler2D uSamplerDiff;",
    "uniform sampler2D uSamplerNorm;",
    "uniform vec3 uLightCol;",
    //"uniform mat3 uSpriteTransform;",
    "/* Normal Map Constants */",
    "const vec3 eyeVec = vec3(0.0, 0.0, 1.0);",
    "void main(void) {",
    "  vec4 col = texture2D(uSamplerDiff, vTextureCoord.xy);",
    "  vec4 norm = texture2D(uSamplerNorm, vTextureCoord.xy) * 2.0 - 1.0;",
    "  float normLength = length(norm.xy);",
    //"  norm.xy = (vec3(norm.xy, 1) * uSpriteTransform).xy;",  // Transform XY normals to match object transformation; Z normal is unaffected on sprites
    "  norm.xy = (vec3(norm.xy, 1) * vSpriteTransform).xy;",  // Transform XY normals to match object transformation; Z normal is unaffected on sprites
    "  float normLengthNew = length(norm.xy);",
    "  norm.xy *= normLength / normLengthNew;", // Restore original XY magnitude, which may be lost if object is scaled
    "  vec3 reflectionDirection = reflect(vInverseLightDirection, norm.xyz);",
    "  float diff = max( dot( reflectionDirection, eyeVec ), 0.0 );",
    "  gl_FragColor = col * diff;",
    "  gl_FragColor.rgb *= uLightCol;",
    "  // Apply final alpha",
    "  gl_FragColor.a = col.a * vAlpha;",
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
/*
 * Declare plugin
 */

Kiwi.Plugins.UberShader = {
  
  name:'UberShader',

  version:'0.2.0',

  minimumKiwiVersion:'1.1.1',

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
  this.bufferItemSize = 22;
  this._vertexBuffer = new Kiwi.Renderers.GLArrayBuffer(gl, this.bufferItemSize);

  // Internal data
  this.game = null;
  this.numLights = 6; // Seems to be the limit for Samsung Galaxy Tab 3; more will exceed its available instructions
  this.maxExponent = 32.0;
  this.specularIntensity = 1.0;
  this.emitStrength = 1.0;
  this.gamma = 1.2;
  this.sphereDeviation = 0.05;
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
      lightPosition: [0, 0, 0],
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
  gl.uniform1i(this.shaderPair.uniforms.uSamplerEmit.location, 3);
  gl.uniform1i(this.shaderPair.uniforms.uSamplerTints.location, 4);
  gl.uniform1i(this.shaderPair.uniforms.uSamplerIrradiance.location, 5);
  gl.uniform1i(this.shaderPair.uniforms.uSamplerReflect.location, 6);


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
  gl.uniform1f(this.shaderPair.uniforms.uMaxSpecularExponent.location, this.maxExponent);
  gl.uniform1f(this.shaderPair.uniforms.uSpecularIntensity.location, this.specularIntensity);
  var lightPositionArray = [];
  var lightColorArray = [];
  // Prepare inverse coordinates (with a guess if the renderer has no game object attached)
  var yOffset = this.game !== null  ?
    this.game.stage.height  :
    600;
  for( var i = 0;  i < this.lights.length;  i++ ) {
    // Generate transformed coordinates
    var camMatrix = new Kiwi.Geom.Matrix( params.camMatrix[0], params.camMatrix[1], params.camMatrix[3], params.camMatrix[4], params.camMatrix[6], params.camMatrix[7] );
    var lightPoint = camMatrix.transformPoint( new Kiwi.Geom.Point( this.lights[i].lightPosition[0], this.lights[i].lightPosition[1] ) );
    // Pack light vector, including falloff exponent
    lightPositionArray.push( this.stageTransform.offsetX * this.stageTransform.scaleX + lightPoint.x );
    lightPositionArray.push( this.stageTransform.offsetY * this.stageTransform.scaleY + (yOffset - lightPoint.y) );
    lightPositionArray.push(this.lights[i].lightPosition[2]);
    lightPositionArray.push(this.lights[i].lightFalloff);
    // Pack light color, including intensity parameter
    lightColorArray.push(this.lights[i].lightColor[0]);
    lightColorArray.push(this.lights[i].lightColor[1]);
    lightColorArray.push(this.lights[i].lightColor[2]);
    lightColorArray.push(this.lights[i].lightIntensity);
  }
  gl.uniform4fv(this.shaderPair.uniforms.uLightPosition.location, new Float32Array( lightPositionArray ) );
  gl.uniform4fv(this.shaderPair.uniforms.uLightCol.location, new Float32Array( lightColorArray ));

  

  //Other uniforms
  gl.uniform2fv(this.shaderPair.uniforms.uResolution.location, params.stageResolution);
  gl.uniformMatrix3fv(this.shaderPair.uniforms.uCamMatrix.location, false, params.camMatrix);
  gl.uniform1f(this.shaderPair.uniforms.uGamma.location, this.gamma);
  gl.uniform1f(this.shaderPair.uniforms.uSphereDeviation.location, this.sphereDeviation);
  
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


  // Assert tint colors
  var t1 = [1.0, 0.0, 0.0, 0.0];
  var t2 = [0.0, 1.0, 0.0, 0.0];
  var t3 = [0.0, 0.0, 1.0, 0.0];
  if( entity.uberTints ) {
    t1 = entity.uberTints.tint1;
    t2 = entity.uberTints.tint2;
    t3 = entity.uberTints.tint3;
  }
  // Assert emission
  var emit = 0.5;
  if(entity.uberEmit) {
    // Transform coordinates
    emit = entity.uberEmit * 0.5 + 0.5;
  }


  // Fill vertex attribute buffer
  // The first four terms are vertex-variant; the rest are per-object but must sadly be duplicated.
  this._vertexBuffer.items.push(
    pt1.x, pt1.y, cell.x, cell.y, entity.alpha, emit, m.a, m.b, m.c, m.d,  t1[0], t1[1], t1[2], t1[3],  t2[0], t2[1], t2[2], t2[3],  t3[0], t3[1], t3[2], t3[3],
    pt2.x, pt2.y, cell.x + cell.w, cell.y, entity.alpha, emit, m.a, m.b, m.c, m.d,   t1[0], t1[1], t1[2], t1[3],  t2[0], t2[1], t2[2], t2[3],  t3[0], t3[1], t3[2], t3[3],
    pt3.x, pt3.y, cell.x + cell.w, cell.y + cell.h, entity.alpha, emit, m.a, m.b, m.c, m.d,   t1[0], t1[1], t1[2], t1[3],  t2[0], t2[1], t2[2], t2[3],  t3[0], t3[1], t3[2], t3[3],
    pt4.x, pt4.y, cell.x, cell.y + cell.h, entity.alpha, emit, m.a, m.b, m.c, m.d,  t1[0], t1[1], t1[2], t1[3],  t2[0], t2[1], t2[2], t2[3],  t3[0], t3[1], t3[2], t3[3]
    );
}

Kiwi.Renderers.UberShaderRenderer.prototype.draw = function (gl) {
  var bufferItemBufferSize = this.bufferItemSize * 4;
  var bufferItemStep = 0;

  this._vertexBuffer.uploadBuffer(gl, this._vertexBuffer.items);

  gl.enableVertexAttribArray(this.shaderPair.attributes.aXYUV);
  gl.vertexAttribPointer(this.shaderPair.attributes.aXYUV, 4, gl.FLOAT, false, bufferItemBufferSize, bufferItemStep * 4);
  bufferItemStep += 4;

  gl.enableVertexAttribArray(this.shaderPair.attributes.aAlphaEmit);
  gl.vertexAttribPointer(this.shaderPair.attributes.aAlphaEmit, 2, gl.FLOAT, false, bufferItemBufferSize, bufferItemStep * 4);
  bufferItemStep += 2;

  gl.enableVertexAttribArray(this.shaderPair.attributes.aMtABCD);
  gl.vertexAttribPointer(this.shaderPair.attributes.aMtABCD, 4, gl.FLOAT, false, bufferItemBufferSize, bufferItemStep * 4);
  bufferItemStep += 4;

  gl.enableVertexAttribArray(this.shaderPair.attributes.aTintCol1);
  gl.vertexAttribPointer(this.shaderPair.attributes.aTintCol1, 4, gl.FLOAT, false, bufferItemBufferSize, bufferItemStep * 4);
  bufferItemStep += 4;

  gl.enableVertexAttribArray(this.shaderPair.attributes.aTintCol2);
  gl.vertexAttribPointer(this.shaderPair.attributes.aTintCol2, 4, gl.FLOAT, false, bufferItemBufferSize, bufferItemStep * 4);
  bufferItemStep +=4;

  gl.enableVertexAttribArray(this.shaderPair.attributes.aTintCol3);
  gl.vertexAttribPointer(this.shaderPair.attributes.aTintCol3, 4, gl.FLOAT, false, bufferItemBufferSize, bufferItemStep * 4);
  bufferItemStep +=4;

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
    uSamplerIrradiance: {
        type: "1i"
    },
    uSamplerReflect: {
        type: "1i"
    },
    uSamplerEmit: {
        type: "1i"
    },
    uSamplerTints: {
        type: "1i"
    },
    uLightPosition: {
        type: "4fv"
    },
    uLightCol: {
        type: "4fv"
    },
    uSpecularIntensity: {
        type: "1f"
    },
    uMaxSpecularExponent: {
        type: "1f"
    },
    uStageScaler: {
        type: "3fv"
    },
    uGamma: {
        type: "1f"
    },
    uSphereDeviation: {
        type: "1f"
    }
  };

  // Configure shaders

  this.vertSource = [
    "precision highp float;",
    "attribute vec4 aXYUV;",
    "attribute vec2 aAlphaEmit;",
    "attribute vec4 aMtABCD;",
    "attribute vec4 aTintCol1;",
    "attribute vec4 aTintCol2;",
    "attribute vec4 aTintCol3;",
    "uniform mat3 uCamMatrix;",
    "uniform vec2 uResolution;",
    "uniform vec2 uTextureSize;",
    "varying vec4 vTextureCoordAndHalfResolution;", // Combining varyings to come under min spec
    "varying vec4 vSpriteTransformScreenPack;",
    "varying vec4 vSpriteTransformWorldPack;",
    "varying vec4 vTintCol1;",
    "varying vec4 vTintCol2;",
    "varying vec4 vTintCol3;",
    "varying vec2 vAlphaAndEmitStrength;",
    "void main(void) {",
    "  vec2 pos = (uCamMatrix * vec3(aXYUV.xy,1)).xy; ",
    "  gl_Position = vec4((pos / uResolution * 2.0 - 1.0) * vec2(1.0, -1.0), 0.0, 1.0);",
    "  vTextureCoordAndHalfResolution = vec4( aXYUV.zw / uTextureSize, uResolution * 0.5);",
    // Compute per-entity transform matrices for fragment
    "  mat3 vSpriteTransformScreen = mat3(aMtABCD.x, aMtABCD.y, 0.0, aMtABCD.z, aMtABCD.w, 0.0, 0.0, 0.0, 1.0) * uCamMatrix;",  // Used for camera-space lighting
    "  vSpriteTransformScreenPack = vec4( vSpriteTransformScreen[0][0], vSpriteTransformScreen[1][0], vSpriteTransformScreen[0][1], vSpriteTransformScreen[1][1] );",
    "  vSpriteTransformWorldPack = vec4( aMtABCD.x, aMtABCD.y, aMtABCD.z, aMtABCD.w );",
    "  vTintCol1 = aTintCol1;",
    "  vTintCol2 = aTintCol2;",
    "  vTintCol3 = aTintCol3;",
    "  vAlphaAndEmitStrength = aAlphaEmit;",
    "}"
  ];

  this.fragSource = [
    "precision highp float;",
    // highp precision is necessary for many terms to produce nice lighting on mobile devices
    // consider upgrading mediump or lowp terms in the fragment shader if necessary
    "varying vec4 vTextureCoordAndHalfResolution;",
    "varying vec4 vSpriteTransformScreenPack;",
    "varying vec4 vSpriteTransformWorldPack;",
    "varying vec4 vTintCol1;",
    "varying vec4 vTintCol2;",
    "varying vec4 vTintCol3;",
    "varying vec2 vAlphaAndEmitStrength;",
    "uniform sampler2D uSamplerDiff;",  // A component is opacity
    "uniform sampler2D uSamplerNorm;",  // A component is specular exponent
    "uniform sampler2D uSamplerSpec;",  // A component is specular opacity
    "uniform sampler2D uSamplerIrradiance;",
    "uniform sampler2D uSamplerReflect;",
    "uniform sampler2D uSamplerEmit;",  // A component is optional phase
    "uniform sampler2D uSamplerTints;", // RGBA mask four tint colours
    "uniform vec4 uLightPosition[5];",  // W component is falloff exponent
    "uniform vec4 uLightCol[5];", // W component is intensity
    "uniform vec3 uStageScaler;",  // XY is stage offset, Z is constant; this is only currently implemented for CocoonJS compatibility
    "uniform float uMaxSpecularExponent;",
    "uniform float uSpecularIntensity;",
    "uniform float uGamma;",
    "uniform float uSphereDeviation;",
    // Normal Map Constants
    "const vec3 eyeVec = vec3(0.0, 0.0, 1.0);",

    "void main(void) {",
    // Procure viewport-corrected fragment coordinate
    "  vec3 fragCoord = gl_FragCoord.xyz * uStageScaler.xyz;",
    // Read source maps
    "  lowp vec4 col = texture2D(uSamplerDiff, vTextureCoordAndHalfResolution.xy);",
    "  lowp vec4 norm = texture2D(uSamplerNorm, vTextureCoordAndHalfResolution.xy);",
    "  lowp vec4 spec = texture2D(uSamplerSpec, vTextureCoordAndHalfResolution.xy);",
    "  lowp vec4 emit = texture2D(uSamplerEmit, vTextureCoordAndHalfResolution.xy);",
    "  lowp vec4 tint = texture2D(uSamplerTints, vTextureCoordAndHalfResolution.xy);",

    // Compute tints
    "  col.rgb = mix(mix(mix(col.rgb, vTintCol1.rgb, tint.r), vTintCol2.rgb, tint.g), vTintCol3.rgb, tint.b);",
    // Specular tints (use tintCol alpha to determine metallicity)
    "  spec.rgb = mix(mix(mix(spec.rgb, vTintCol1.rgb, tint.r * vTintCol1.a), vTintCol2.rgb, tint.g * vTintCol2.a), vTintCol3.rgb, tint.b * vTintCol3.a);",

    // Remap normal to transformed coordinate space: both screen and world versions
    "  norm.xyz = norm.xyz * 2.0 - 1.0;", // Preserve alpha
    "  mediump float normLength = length(norm.xy);",
    "  lowp vec3 normWorld = norm.xyz;",
    // Expand matrices from packed format
    "  norm.y *= -1.0;",
    "  normWorld.xy = (vec3(normWorld.xy, 1.0) * mat3( vSpriteTransformWorldPack.x, vSpriteTransformWorldPack.y, 0.0, vSpriteTransformWorldPack.z, vSpriteTransformWorldPack.w, 0.0, 0.0, 0.0, 1.0 ) ).xy;",
    "  norm.xy = (vec3(norm.xy, 1.0) * mat3( vSpriteTransformScreenPack.x, vSpriteTransformScreenPack.y, 0.0, vSpriteTransformScreenPack.z, vSpriteTransformScreenPack.w, 0.0, 0.0, 0.0, 1.0 ) ).xy;",  // Transform XY normals to match object transformation; Z normal is unaffected on sprites
    "  norm.xy *= normLength / length(norm.xy);", // Restore original XY magnitude, which may be lost if object matrix is scaled
    "  norm.xyz = normalize(norm.xyz);",
    "  norm.y *= -1.0;",
    "  normWorld.xy *= normLength / length(normWorld.xy);",
    "  normWorld = normalize(normWorld);",

    // Compute fragment off-axis distortion
    // "  vec2 normalizedFragCoord = vec2( (fragCoord.x - vTextureCoordAndHalfResolution.z) / vTextureCoordAndHalfResolution.z, (fragCoord.y - vTextureCoordAndHalfResolution.w) / vTextureCoordAndHalfResolution.w );",
    // "  vec2 normTheta = asin( normWorld.xy );",
    // "  vec2 fragTheta = asin( normalizedFragCoord ) * uSphereDeviation;",
    // "  vec2 sigmaTheta = normTheta + fragTheta;",
    // "  normWorld.xy = sin(sigmaTheta);",
    "  normWorld.xy = sin( asin( normWorld.xy ) + asin( vec2( (fragCoord.x - vTextureCoordAndHalfResolution.z) / vTextureCoordAndHalfResolution.z, (fragCoord.y - vTextureCoordAndHalfResolution.w) / vTextureCoordAndHalfResolution.w ) ) * uSphereDeviation );",
    "  normWorld = normalize(normWorld);",
    // Compute reflection map lookup
    "  vec2 refLook = normWorld.xy * vec2(0.5, -0.5) + 0.5;",
    // Cumulative lighting
    "  lowp vec3 diffSum = texture2D(uSamplerIrradiance, refLook.xy).rgb;",
    "  lowp vec3 specSum = vec3(0.0);",
    "  mediump float fragmentSpecularExponent = norm.a * uMaxSpecularExponent;",

    
    // Process lights
    "  vec3 lightDir = vec3(0.0);",
    "  mediump float lightIntensity = 0.0;",
    "  lowp vec3 lightContribution = vec3(0.0);",
    "  mediump vec3 reflectionDirection = vec3(0.0);",
    "  for(int i = 0; i < 5;  i++) {",
    // Obtain coordinate lighting data
    "    lightDir = fragCoord.xyz - uLightPosition[i].xyz;",
    "    lightIntensity = pow(uLightCol[i].w / length(lightDir), uLightPosition[i].w);",
    "    lightContribution = uLightCol[i].rgb * lightIntensity;",
    "    reflectionDirection = reflect( normalize( lightDir ), norm.xyz );",
    // Accumulate light
    "    diffSum += lightContribution * max( dot( reflectionDirection, norm.xyz ), 0.0 );",
    "    specSum += lightContribution * pow(max( dot( reflectionDirection, eyeVec ), 0.0 ), fragmentSpecularExponent);",
    "  }",

    // Final composite
    "  gl_FragColor = vec4(",
    "    pow( ",  // Begin gamma correction
    "    col.rgb * diffSum * col.a", // Diffuse color
    "    + spec.rgb * (specSum * spec.a * uSpecularIntensity + texture2D(uSamplerReflect, refLook.xy).rgb)", // Specular color including environment reflection
    "    + emit.rgb * (0.5 + 0.5 * cos( (emit.a + vAlphaAndEmitStrength.y) * 6.283) )",  // Emissive color
    "    , vec3(uGamma) ),",  // End gamma correction
    "    min(col.a + spec.a, 1.0) * vAlphaAndEmitStrength.x",  // Alpha
    "  );",
    /*"  diffSum *= col.rgb * col.a;",
    "  specSum *= spec.rgb * spec.a * uSpecularIntensity;",
    "  lowp vec3 reflectSum = spec.rgb * texture2D(uSamplerReflect, refLook.xy).rgb;",
    "  lowp vec3 emitSum = emit.rgb * (0.5 + 0.5 * cos( (emit.a + vAlphaAndEmitStrength.y) * 6.283) );",
    "  lowp vec3 gamma = pow( diffSum + specSum + reflectSum + emitSum,  vec3( uGamma ) );",
    "  lowp float alphaSum = min(col.a + spec.a, 1.0) * vAlphaAndEmitStrength.x;",
    "  gl_FragColor = vec4( gamma, alphaSum );",*/
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
  this.attributes.aAlphaEmit = gl.getAttribLocation(this.shaderProgram, "aAlphaEmit");
  this.attributes.aMtABCD = gl.getAttribLocation(this.shaderProgram, "aMtABCD");
  this.attributes.aTintCol1 = gl.getAttribLocation(this.shaderProgram, "aTintCol1");
  this.attributes.aTintCol2 = gl.getAttribLocation(this.shaderProgram, "aTintCol2");
  this.attributes.aTintCol3 = gl.getAttribLocation(this.shaderProgram, "aTintCol3");
  
  this.initUniforms(gl);
}
HTML5 UberShader for Kiwi.JS
============================

* Name: Uber Shader Plugin.
* Version: 1.0.0
* Type: Shader
* Author: Benjamin D. Richards for Kiwi.js Team
* Website: www.kiwijs.org
* Kiwi.js Version Last Tested: 1.1.1

----------------------------------------------------------------------------------------
Versions:
----------------------------------------------------------------------------------------

1.0.0
- Initial release: 5 lights, reflection and irradiance maps, gamma, sphere deviation.


----------------------------------------------------------------------------------------
Files/Folders:
----------------------------------------------------------------------------------------
* README.md 	 - This readme file.
* readme.html    - HTML version of this readme file.
* docs/ 		 - API documentation.
* examples/ 	 - Examples of the plugin in action. 
* src/		 - The source files for the plugin. 
* libs/		 - External Libraries that this plugin requires.
* assets/      - Diagrams for this readme.


----------------------------------------------------------------------------------------
Description:
----------------------------------------------------------------------------------------

Thank you for downloading the UberShader for [Kiwi.JS](http://www.kiwijs.org/). This shader is designed to simulate lifelike lighting effects on 2D sprites, allowing you to create unprecedented detail and quality in your Kiwi.JS games.


## Features

### Texture Map Types

The UberShader uses seven texture maps: five to describe the surface of an object, and two to describe local lighting conditions.

* Diffuse: Flat color before lighting.
* Normal: Surface contour information, used to create detailed lighting.
* Specular: Surface reflectivity, controlling color and intensity of highlights.
* Emit: Surface glow information.
* Tint: Each entity can have up to three custom color channels to differentiate diffuse and specular color.
* Irradiance: Sphere map of local light, sampled over a hemisphere.
* Reflection: Sphere map of local light, sampled cleanly.

### Point Lights

The UberShader supports 5 colored point lights with 3D coordinates and custom falloff. These can add detail to the overall light described by irradiance and reflections.

### Gamma Correction

The UberShader can perform gamma correction on its output. By default this is set to 1.2, slightly darkening shadows and emphasising highlights.

### Sphere Deviation

The Ubershader can distort image-based lighting and reflections from sphere maps. This creates an illusion of proximity in the reflections.


----------------------------------------------------------------------------------------
Power Users Guide: 
----------------------------------------------------------------------------------------

This is a powerful shader, so we've written an in-depth guide to getting the most from it. Check it out at [http://www.kiwijs.org/documentation/tutorials/ubershader-plugin/](http://www.kiwijs.org/documentation/tutorials/ubershader-plugin/). If you just want to get started, keep reading, download the repo, and check out the examples.


----------------------------------------------------------------------------------------
How to Use: 
----------------------------------------------------------------------------------------

This section contains information necessary to set up the UberShader plugin in your game.

### Installing the Plugin

This plugin is intended for use with [Kiwi.JS](http://www.kiwijs.org/). To add UberShader functionality to your Kiwi.JS game, simply include the plugin file, either `UberShader-1.0.0.js` or `UberShader-1.0.0.min.js`, after including the Kiwi.JS library. You will also need to include the MultiTexture plugin `MultiTexture-1.0.0.js`. We recommend placing all plugins inside a `plugins` folder:

```
<script src="kiwi.js"></script>
<script src="plugins/UberShader-1.0.0.js"></script>
<script src="plugins/MultiTexture-1.0.0.js"></script>
```

### Invoking the Uber Shader

To apply the UberShader to an object, you must follow three steps.

First, create a MultiTexture containing all the texture maps. Load your images individually, either as single images or as sprite sheets, then collate them into a MultiTexture. We recommend you do this in `State.create`. Make sure to list the images in the correct order:

* Diffuse
* Normal
* Specular
* Emit
* Tint
* Irradiance
* Reflection

The MultiTextureAtlas is constructed thus:

`Kiwi.Textures.MultiTextureAtlas( name, imageType, cells, textureArray, sequences )`

	`name` (String): The identifier of the atlas.
	`imageType` (Number): The image type, either Kiwi.Textures.MultiTextureAtlas.SINGLE_IMAGE, Kiwi.Textures.MultiTextureAtlas.SPRITE_SHEET, or Kiwi.Textures.MultiTextureAtlas.TEXTURE_ATLAS. Treat this as a hint for the purpose of the MultiTextureAtlas.
	`cells` (Array): The cell data for the MultiTextureAtlas. This is most easily copied from one of the source images.
	`textureArray` (Array): An array of images to form the MultiTexture.
	`sequences` (Array): An array of animation sequences. You may safely define this as `null`.

Example:

```
// Load the myXXX assets during preload
//...

// During create:

var multiTextures = [
	this.textures.myDiff.image,
	this.textures.myNorm.image,
	this.textures.mySpec.image,
	this.textures.myEmit.image,
	this.textures.myTint.image,
	this.textures.myIrradianceMap.image,
	this.textures.myReflectionMap.image
];
var myMTA = new Kiwi.Textures.MultiTextureAtlas("myMTA", Kiwi.Textures.MultiTextureAtlas.SINGLE_IMAGE, this.textures.myDiff.cells, multiTextures, null);
this.textureLibrary.add( myMTA );
```

Second, you must create your object using the MultiTextureAtlas. Make certain that you have specified the correct image type when creating the MultiTextureAtlas:

```
// where "this" is the current state
var myEntity = new Kiwi.GameObjects.Sprite( this, this.textures.myMTA, 0, 0 );
```

Third, you must assign the UberShader renderer to your game entity, and configure some additional information. The UberShader renderer does not require, but works better with, a link to the Game object.

```
// where "this" is the current state

var uberShaderRenderer = this.game.renderer.requestSharedRenderer( "UberShaderRenderer" );

myEntity.glRenderer = uberShaderRenderer;

uberShaderRenderer.game = this.game;
```

### Setting Up Lights

You can configure lights on the UberShader renderer. These will apply to every object that uses that renderer.

There are 5 lights available, stored as the `uberShaderRenderer.lights` array. Each element in this array is an object with the following properties:

	* `lightVector`: The position of the light, relative to the screen.
	* `lightColor`: RGB values in the range 0-1.
	* `lightIntensity`: The distance at which the light reaches normal strength, measured in pixels; usually in the range 100-500.
	* `lightFalloff`: The rate at which light falls off. The default value is 2, which represents falloff with the square of the distance as in nature. You may give it any value, but will probably only be interested in 1 or 0.

By default, these lights are colored white ( [1,1,1] ) and have intensity 0. Any lights you do not wish to use can be set to 0.

### Optional Per Entity Parameters

You may specify optional parameters directly on entities using the UberShader. These allow you to customise the emit and tint qualities of the shader on a per-object basis.

To control the brightness of emission, add the `uberEmit` property to a game entity. Set it in the range 0-1.

```
myEntity.uberEmit = 1.0;
```

To control the color of tint masks, add an `uberTints` object to a game entity, and populate it with `tint1`, `tint2` and `tint3`. Each tint is a color defined as an array of 4 values in the range 0-1. The first three values are RGB. The last value defines whether the tint also applies to specular color; a value of 0 does not affect specular color, while a value of 1 creates metallic reflections.

```
myEntity.uberTints = {
    tint1: [1.0, 0.0, 0.0,  0.0],
    tint2: [0.0, 1.0, 0.0,  0.0],
    tint3: [0.0, 0.0, 1.0,  0.0]
};
```

### Reusing the Uber Shader

Once you have initialised the UberShader, you may assign it to other objects, so long as they have a valid MultiTextureAtlas:

```
var myEntity2 = new Kiwi.GameObjects.Sprite( this, this.textures.myMTA, 0, 0 );
myEntity2.glRenderer = uberTextureRenderer;
// OR
myEntity2.glRenderer = this.game.renderer.requestSharedRenderer( "UberShaderRenderer" );
```

Because this refers to the same renderer, you do not need to reconfigure the lights or relink it to the Game object.

You may also use the standard Kiwi.JS renderer cloning techniques to create another renderer, but you will need to link the new clone to the Game object and provide unique lighting information.

### Customising the Uber Shader

The UberShader works very efficiently, but it has to do a lot of work to create high-quality renders. If you are not using every feature of the shader, you can see substantial performance upgrades by disabling unused features. Please contact us via the [Kiwi.JS website](http://www.kiwijs.org/) to discuss creating a custom performance build.

### Questions and Answers

* **Can I use a sprite sheet with the UberShader?** Yes. Simply make sure you set up the sprite cell data correctly on the asset you use for the MultiTextureAtlas' `cells` parameter. It will be applied to all the textures.
* **Can I use different image sizes for different texture maps?** Yes, but they must be of the same proportion and layout. The shader will use proportional cells, treating each image as though it were stretched to match the "base image" you provided for the texture atlas cells in the MultiTextureAtlas. It will not respect texture atlas cells defined on other textures.
* **Can I animate the irradiance or reflection maps?** No. The shader achieves high performance by relying on fixed coordinates for sphere maps. Adding the extra calculations to support multiple atlas cells would be too complex. If you wish to animate a sphere map, you will have to do it as a canvas draw operation. Consult `Kiwi.GameObjects.TextField` to see how we deal with real-time draw operations, in particular tagging textures as "dirty" so they may be updated on the video card.

----------------------------------------------------------------------------------------
Future Concepts:
----------------------------------------------------------------------------------------

Although an UberShader should be able to do everything, there are always a few things that get cut for time or performance reasons. Here are a few features we'd like to introduce in future versions, of varying levels of realism:

#### Anisotropic Highlights

For that brushed metal look, or realistic hair rendering.

#### Realtime Sub-Surface Scattering

For shiny noses and glowing ears. Really, realtime SSS makes skin come to life.

#### Shadows

We'd like to include self-shadowing and realtime shadows. This is actually a very complicated issue, and we'd probably wind up including parallax shading before it was completed. That would look really cool, though.

#### Global Illumination

High-end graphical solutions probe the environment to determine the color of nearby objects. Light bouncing between surfaces can cause color bleed, and builds up a much more realistic vision of the world.

#### Refraction

Currently, transparent objects cannot refract the background. Future versions of Kiwi.JS will open up that data to manipulation, permitting refraction shaders.

#### Fuzzy Reflection

Right now we only have two levels of environment map: a crisp reflection, and a blurred irradiance map. It would be more realistic to interpolate between the two, allowing for sharp reflections on some parts of an object, and duller gloss on other parts. This is possible using mipmap technology and some clever pre-processing, further accelerating our lightning-fast image-based lighting techniques.
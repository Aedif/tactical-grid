const fragment = `
varying vec2 vMaskCoord;
varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform sampler2D mask;
uniform float alpha;
uniform float npmAlpha;
uniform vec4 maskClamp;

void main(void)
{
    float clip = step(3.5,
        step(maskClamp.x, vMaskCoord.x) +
        step(maskClamp.y, vMaskCoord.y) +
        step(vMaskCoord.x, maskClamp.z) +
        step(vMaskCoord.y, maskClamp.w));

    vec4 original = texture2D(uSampler, vTextureCoord);
    vec4 masky = texture2D(mask, vMaskCoord);
    gl_FragColor = masky * original.a;
  }
`;

const vertex = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform mat3 otherMatrix;

varying vec2 vMaskCoord;
varying vec2 vTextureCoord;

void main(void)
{
    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    vTextureCoord = aTextureCoord;
    vMaskCoord = ( otherMatrix * vec3( aTextureCoord, 1.0)  ).xy;
}
`;

/**
 * This handles a Sprite acting as a mask, as opposed to a Graphic.
 *
 * WebGL only.
 * @memberof PIXI
 */
export class CustomSpriteMaskFilter extends PIXI.Filter {
  /** @private */
  _maskSprite;

  /** Mask matrix */
  maskMatrix;

  /**
   * @param {PIXI.Sprite} sprite - The target sprite.
   */
  constructor(sprite) {
    super(vertex, fragment, undefined);
    this.maskSprite = sprite;
    this.maskMatrix = new PIXI.Matrix();
  }

  get maskSprite() {
    return this._maskSprite;
  }

  set maskSprite(value) {
    this._maskSprite = value;

    if (this._maskSprite) {
      this._maskSprite.renderable = false;
    }
  }

  /**
   * Applies the filter
   * @param filterManager - The renderer to retrieve the filter from
   * @param input - The input render target.
   * @param output - The target to output to.
   * @param clearMode - Should the output be cleared before rendering to it.
   */
  apply(filterManager, input, output, clearMode) {
    const maskSprite = this._maskSprite;
    const tex = maskSprite._texture;

    if (!tex.valid) {
      return;
    }
    if (!tex.uvMatrix) {
      // margin = 0.0, let it bleed a bit, shader code becomes easier
      // assuming that atlas textures were made with 1-pixel padding
      tex.uvMatrix = new PIXI.TextureMatrix(tex, 0.0);
    }
    tex.uvMatrix.update();

    this.uniforms.npmAlpha = tex.baseTexture.alphaMode ? 0.0 : 1.0;
    this.uniforms.mask = tex;
    // get _normalized sprite texture coords_ and convert them to _normalized atlas texture coords_ with `prepend`
    this.uniforms.otherMatrix = filterManager
      .calculateSpriteMatrix(this.maskMatrix, maskSprite)
      .prepend(tex.uvMatrix.mapCoord);
    this.uniforms.alpha = maskSprite.worldAlpha;
    this.uniforms.maskClamp = tex.uvMatrix.uClampFrame;

    filterManager.applyFilter(this, input, output, clearMode);
  }
}

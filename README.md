Altar.prototype.\_applyFrameTexture = function (frameIndex) {
if (!this.entity.render) return;

frameIndex = Math.max(0, Math.min(frameIndex | 0, this.frameTextures.length - 1));

// ✅ DEBUG
console.log("🔍 DEBUG \_applyFrameTexture:");
console.log(" - frameIndex:", frameIndex);
console.log(" - this.frameTextures:", this.frameTextures);
console.log(" - this.frameTextures.length:", this.frameTextures ? this.frameTextures.length : "NULL");

var asset = this.frameTextures && this.frameTextures[frameIndex];

console.log(" - asset:", asset);

if (!asset) {
console.warn("⚠ Frame", frameIndex, "não tem textura");
return;
}

var tex = asset.resource || asset;

console.log(" - tex:", tex);
console.log(" - tex instanceof pc.Texture:", tex instanceof pc.Texture);

var mat = this.entity.render.meshInstances[0].material;
if (!mat) {
mat = new pc.StandardMaterial();
this.entity.render.meshInstances[0].material = mat;
}

if (tex && tex instanceof pc.Texture) {
mat.diffuseMap = tex;
mat.emissiveMap = tex;
mat.emissive = new pc.Color(1, 1, 1);
mat.emissiveIntensity = 0.8 + (frameIndex \* 0.2);
mat.opacityMap = tex;
mat.blendType = pc.BLEND_PREMULTIPLIED;
mat.useLighting = false;
mat.cull = pc.CULLFACE_NONE;

    console.log("✅ Frame", frameIndex, "aplicado | Intensity:", mat.emissiveIntensity);

} else {
console.warn("⚠ Textura não é válida, usando cor");
var colors = [
new pc.Color(0.2, 0.2, 0.2),
new pc.Color(0.4, 0.2, 0.2),
new pc.Color(0.6, 0.4, 0.2),
new pc.Color(0.8, 0.6, 0.2),
new pc.Color(1, 1, 0.5),
];
var color = colors[frameIndex] || colors[0];
mat.diffuse = color;
mat.emissive = color;
mat.emissiveIntensity = 1.0;
mat.useLighting = false;
mat.diffuseMap = null;
mat.emissiveMap = null;
mat.opacityMap = null;
}

mat.update();
};

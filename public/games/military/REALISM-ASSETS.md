# Outpost Zero photographed surface materials

These local JPEG texture maps are supplied by [Poly Haven](https://polyhaven.com/)
under the [CC0 1.0 public-domain dedication](https://polyhaven.com/license).
The maps contain photographed surfaces; they are not generated grunge or a
screen-space filter. Each set includes diffuse color, an OpenGL normal map, and
roughness. Resolution is selected at download time to keep the browser payload
bounded: concrete and plaster diffuse maps use 2K; normal/roughness maps
and the remaining diffuse maps use 1K.

| Local filename prefix | Poly Haven asset | Intended substrate |
| --- | --- | --- |
| `realism-concrete-` | [brushed_concrete_03](https://polyhaven.com/a/brushed_concrete_03) | Floors and structural concrete |
| `realism-plaster-` | [painted_plaster_wall](https://polyhaven.com/a/painted_plaster_wall) | Painted interior walls and ceiling panels |
| `realism-brick-` | [brick_wall_001](https://polyhaven.com/a/brick_wall_001) | Masonry buildings |
| `realism-fabric-` | [denim_fabric](https://polyhaven.com/a/denim_fabric) | Woven cloth, bedding and gloves |
| `realism-wood-` | [fine_grained_wood](https://polyhaven.com/a/fine_grained_wood) | Timber furnishings and crates |
| `realism-weaponMetal-` | [metal_plate_02](https://polyhaven.com/a/metal_plate_02) | Fine-scale metal detail |

The suffixes are `color.jpg`, `normal.jpg`, and `roughness.jpg`. Source files are
downloaded from the URLs returned by `https://api.polyhaven.com/files/ASSET_ID`;
the game loads the bundled local copies only, with no runtime external requests.
Diffuse color uses sRGB. Normal and roughness maps are linear data. Every
material's UV repeats are independent; the renderer releases its per-world
texture clones when changing maps and releases source maps when it shuts down.

The earlier photographs, environment HDR, character asset and Three.js code
licenses are documented separately in [ATTRIBUTION.md](ATTRIBUTION.md).

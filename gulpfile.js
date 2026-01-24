'use strict';

const gulp = require('gulp');
const build = require('@microsoft/sp-build-web');
const fs = require('fs');
const path = require('path');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

// Fix manifest paths for SPFx 1.4.1 with includeClientSideAssets: true
// When includeClientSideAssets is true, files are flattened to ClientSideAssets root,
// but SPFx 1.4.1 generates manifests with "dist/" prefix. This task removes the prefix.
const fixManifestPaths = build.subTask('fix-manifest-paths', function(gulp, buildOptions, done) {
  const distFolder = path.join(__dirname, 'dist');

  if (!fs.existsSync(distFolder)) {
    done();
    return;
  }

  const manifestFiles = fs.readdirSync(distFolder).filter(f => f.endsWith('.manifest.json'));

  manifestFiles.forEach(manifestFile => {
    const manifestPath = path.join(distFolder, manifestFile);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    if (manifest.loaderConfig && manifest.loaderConfig.scriptResources) {
      let modified = false;
      Object.keys(manifest.loaderConfig.scriptResources).forEach(key => {
        const resource = manifest.loaderConfig.scriptResources[key];
        if (resource.type === 'path' && resource.path && resource.path.startsWith('dist/')) {
          resource.path = resource.path.replace('dist/', '');
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`[fix-manifest-paths] Fixed paths in ${manifestFile}`);
      }
    }
  });

  done();
});

build.initialize(gulp);

// Create a simple wrapper task for gulp
gulp.task('fix-manifests', function(done) {
  fixManifestPaths.executeTask(gulp, done);
});
import type { Types } from '@cornerstonejs/core';
import {
  RenderingEngine,
  Enums,
  setVolumesForViewports,
  volumeLoader,
  CONSTANTS,
  geometryLoader,
  eventTarget,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
  setCtTransferFunctionForVolumeActor,
  addButtonToToolbar,
  createInfoSection,
  downloadSurfacesData,
  addManipulationBindings,
  addLabelToToolbar,
  createAndCacheGeometriesFromSurfaces,
} from '../../../../utils/demo/helpers';
import * as cornerstoneTools from '@cornerstonejs/tools';

// This is for debugging purposes
console.warn(
  'Click on index.ts to open source code for this example --------->'
);

const {
  ToolGroupManager,
  Enums: csToolsEnums,
  segmentation,
  BrushTool,
} = cornerstoneTools;

setTitleAndDescription(
  'Surface to Volume Labelmap',
  'This demonstration showcases the usage of PolySEG WASM module to convert a surface to a labelmap. The labelmap can then be used for further processing, such as 3D rendering.'
);

const { ViewportType } = Enums;

// Define a unique id for the volume
const volumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use
const volumeId = `${volumeLoaderScheme}:${volumeName}`; // VolumeId with loader id + volume id
const segmentationId = 'MY_SEGMENTATION_ID';

// ======== Set up page ======== //

const size = '500px';
const content = document.getElementById('content');
const viewportGrid = document.createElement('div');

viewportGrid.style.display = 'flex';
viewportGrid.style.display = 'flex';
viewportGrid.style.flexDirection = 'row';

const element1 = document.createElement('div');
const element2 = document.createElement('div');
const element3 = document.createElement('div');
element1.style.width = size;
element1.style.height = size;
element2.style.width = size;
element2.style.height = size;
element3.style.width = size;
element3.style.height = size;

// Disable right click context menu so we can have right click tools
element1.oncontextmenu = (e) => e.preventDefault();
element2.oncontextmenu = (e) => e.preventDefault();
element3.oncontextmenu = (e) => e.preventDefault();

viewportGrid.appendChild(element1);
viewportGrid.appendChild(element2);
viewportGrid.appendChild(element3);

content.appendChild(viewportGrid);

createInfoSection(content, { ordered: true })
  .addInstruction('Use the Brush Tool for segmentation in MPR viewports')
  .addInstruction(
    'Toggle between different segmentation tools like Sphere Brush and Eraser'
  )
  .addInstruction('Convert the labelmap to a 3D surface representation')
  .addInstruction('Manipulate the 3D view using the Trackball Rotate Tool')
  .addInstruction('Toggle the visibility of the 3D anatomy model');

// ============================= //
const toolGroupId = 'ToolGroup_MPR';
const toolGroupId2 = 'ToolGroup_3D';
let toolGroup1, toolGroup2;
let renderingEngine;
// Create the viewports
const viewportId1 = 'CT_3D';
const viewportId2 = 'CT';

addButtonToToolbar({
  title: 'Convert surface to labelmap',
  onClick: async () => {
    // add the 3d representation to the 3d toolgroup
    await segmentation.addSegmentationRepresentations(viewportId2, [
      {
        segmentationId,
        type: csToolsEnums.SegmentationRepresentations.Labelmap,
      },
    ]);
  },
});

addLabelToToolbar({
  id: 'progress',
  title: 'Progress:',
  style: {
    paddingLeft: '10px',
  },
});

eventTarget.addEventListener(Enums.Events.WEB_WORKER_PROGRESS, (evt) => {
  const label = document.getElementById('progress');

  const { progress } = evt.detail;
  label.innerHTML = `Progress: ${(progress * 1).toFixed(2)}%`;
});

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  // Add tools to Cornerstone3D
  cornerstoneTools.addTool(BrushTool);

  // Define tool groups to add the segmentation display tool to
  toolGroup1 = ToolGroupManager.createToolGroup(toolGroupId);
  toolGroup2 = ToolGroupManager.createToolGroup(toolGroupId2);

  addManipulationBindings(toolGroup1, { is3DViewport: true });
  addManipulationBindings(toolGroup2);

  // Get Cornerstone imageIds for the source data and fetch metadata into RAM
  const imageIds = await createImageIdsAndCacheMetaData({
    StudyInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
    SeriesInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
    wadoRsRoot: 'https://d14fa38qiwhyfd.cloudfront.net/dicomweb',
  });

  // Define a volume in memory
  const volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds,
  });

  // Instantiate a rendering engine
  const renderingEngineId = 'myRenderingEngine';
  renderingEngine = new RenderingEngine(renderingEngineId);

  const viewportInputArray = [
    {
      viewportId: viewportId1,
      type: ViewportType.VOLUME_3D,
      element: element1,
      defaultOptions: {
        background: CONSTANTS.BACKGROUND_COLORS.slicer3D,
      },
    },
    {
      viewportId: viewportId2,
      type: ViewportType.ORTHOGRAPHIC,
      element: element2,
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
      },
    },
  ];

  renderingEngine.setViewports(viewportInputArray);

  toolGroup1.addViewport(viewportId1, renderingEngineId);
  toolGroup2.addViewport(viewportId2, renderingEngineId);

  // Set the volume to load
  volume.load();

  // Set volumes on the viewports
  await setVolumesForViewports(
    renderingEngine,
    [{ volumeId, callback: setCtTransferFunctionForVolumeActor }],
    [viewportId2]
  );
  const geometryIds = await createAndCacheGeometriesFromSurfaces();

  // Add the segmentations to state
  segmentation.addSegmentations([
    {
      segmentationId,
      representation: {
        // The type of segmentation
        type: csToolsEnums.SegmentationRepresentations.Surface,
        // The actual segmentation data, in the case of contour geometry
        // this is a reference to the geometry data
        data: {
          geometryIds,
        },
      },
    },
  ]);

  // // Add the segmentation representation to the viewport
  await segmentation.addSegmentationRepresentations(viewportId1, [
    {
      segmentationId,
      type: csToolsEnums.SegmentationRepresentations.Surface,
    },
  ]);

  // Render the image
  renderingEngine.render();
}

run();

package com.eggplant.detector.detection.ncnn

import android.content.Context
import android.graphics.BitmapFactory
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.eggplant.detector.R
import com.eggplant.detector.detection.api.DetectionFrame
import com.eggplant.detector.detection.api.EngineState
import com.eggplant.detector.detection.api.InputSource
import com.eggplant.detector.detection.api.RgbaFrame
import com.eggplant.detector.detection.api.RgbFrame
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.nio.ByteBuffer

@RunWith(AndroidJUnit4::class)
class NcnnDetectionEngineInstrumentedTest {
    private data class Fixture(
        val resourceId: Int,
        val expectedDiseaseId: String,
    )

    @Test
    fun packagedModelSurvivesSequentialInferenceAndEngineReinitialization() {
        assumeTrue(
            "Run separately with -Pandroid.testInstrumentationRunnerArguments.realModel=true",
            InstrumentationRegistry.getArguments().getString("realModel") == "true",
        )
        val context = ApplicationProvider.getApplicationContext<Context>()
        // The emulator exposes software SwiftShader as Vulkan; use CPU so this
        // fixture verifies NCNN itself instead of benchmarking a software GPU.
        var engine = NcnnDetectionEngine(context, preferVulkan = false)

        try {
            assertEquals(EngineState.READY, engine.initialize())
            knownPositiveFixtures.forEachIndexed { index, fixture ->
                val image = loadFixture(context, fixture.resourceId)
                assertPositiveDisease(
                    result = engine.detect(rgbFrame(image.width, image.height, image.rgb, timestampMillis = index + 1L)).getOrThrow(),
                    expectedDiseaseId = fixture.expectedDiseaseId,
                )
            }
            engine.close()

            // CameraController recreation closes this wrapper, while the app
            // intentionally retains and reuses the process-wide native model.
            engine = NcnnDetectionEngine(context, preferVulkan = false)
            assertEquals(EngineState.READY, engine.initialize())
            knownPositiveFixtures.forEachIndexed { index, fixture ->
                val image = loadFixture(context, fixture.resourceId)
                assertPositiveDisease(
                    result = engine.detect(rgbFrame(image.width, image.height, image.rgb, timestampMillis = index + 10L)).getOrThrow(),
                    expectedDiseaseId = fixture.expectedDiseaseId,
                )
            }
        } finally {
            engine.close()
        }
    }

    @Test
    fun directRgbaInferenceMatchesRgbInferenceForKnownPositiveFixtures() {
        assumeTrue(
            "Run separately with -Pandroid.testInstrumentationRunnerArguments.realModel=true",
            InstrumentationRegistry.getArguments().getString("realModel") == "true",
        )
        val context = ApplicationProvider.getApplicationContext<Context>()
        val engine = NcnnDetectionEngine(context, preferVulkan = false)

        try {
            assertEquals(EngineState.READY, engine.initialize())
            knownPositiveFixtures.forEachIndexed { index, fixture ->
                val image = loadFixture(context, fixture.resourceId)
                val rgbResult = engine.detect(
                    rgbFrame(image.width, image.height, image.rgb, timestampMillis = index + 100L),
                ).getOrThrow()
                val rgba = ByteBuffer.allocateDirect(image.width * image.height * 4)
                var rgbOffset = 0
                repeat(image.width * image.height) {
                    rgba.put(image.rgb[rgbOffset++])
                    rgba.put(image.rgb[rgbOffset++])
                    rgba.put(image.rgb[rgbOffset++])
                    rgba.put(0xff.toByte())
                }
                rgba.flip()
                val rgbaResult = engine.detectRgba(
                    RgbaFrame(
                        width = image.width,
                        height = image.height,
                        rowStride = image.width * 4,
                        rgbaBytes = rgba,
                        rotationDegrees = 0,
                        timestampMillis = index + 100L,
                        source = InputSource.LIVE,
                        sceneToken = index + 100L,
                    ),
                ).getOrThrow()

                assertPositiveDisease(rgbResult, fixture.expectedDiseaseId)
                assertPositiveDisease(rgbaResult, fixture.expectedDiseaseId)
                assertEquals(
                    "Direct RGBA inference must preserve the model class for ${fixture.expectedDiseaseId}.",
                    rgbResult.detections.first().modelClass,
                    rgbaResult.detections.first().modelClass,
                )
            }
        } finally {
            engine.close()
        }
    }

    @Test
    fun realModelDoesNotFabricateDiseaseForSyntheticNegativeFrame() {
        assumeTrue(
            "Run separately with -Pandroid.testInstrumentationRunnerArguments.realModel=true",
            InstrumentationRegistry.getArguments().getString("realModel") == "true",
        )
        val context = ApplicationProvider.getApplicationContext<Context>()
        val engine = NcnnDetectionEngine(context, preferVulkan = false)
        val rgb = ByteArray(768 * 768 * 3)

        try {
            assertEquals(EngineState.READY, engine.initialize())
            val result = engine.detect(rgbFrame(768, 768, rgb, 1L)).getOrThrow()

            assertTrue("Synthetic black frame must not report disease detections.", result.detections.isEmpty())
        } finally {
            engine.close()
        }
    }

    private data class FixtureImage(
        val width: Int,
        val height: Int,
        val rgb: ByteArray,
    )

    private fun loadFixture(context: Context, resourceId: Int): FixtureImage {
        val bitmap = requireNotNull(BitmapFactory.decodeResource(context.resources, resourceId))
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
        bitmap.recycle()
        val rgb = ByteArray(pixels.size * 3)
        var offset = 0
        pixels.forEach { color ->
            rgb[offset++] = (color shr 16 and 0xff).toByte()
            rgb[offset++] = (color shr 8 and 0xff).toByte()
            rgb[offset++] = (color and 0xff).toByte()
        }
        return FixtureImage(width, height, rgb)
    }

    private fun rgbFrame(width: Int, height: Int, rgb: ByteArray, timestampMillis: Long): RgbFrame =
        RgbFrame(
            width = width,
            height = height,
            rgbBytes = rgb,
            timestampMillis = timestampMillis,
            source = InputSource.GALLERY,
            sceneToken = timestampMillis,
        )

    private fun assertPositiveDisease(result: DetectionFrame, expectedDiseaseId: String) {
        assertTrue(result.inferenceMillis >= 0L)
        assertFalse("The packaged positive fixture must produce a detection.", result.detections.isEmpty())
        assertTrue(
            "The positive fixture must include $expectedDiseaseId.",
            result.detections.any { it.modelClass.diseaseId == expectedDiseaseId },
        )
        assertTrue(result.detections.all { it.modelClass in ModelMetadata.EGGPLANT_YOLO26M.classes })
    }

    private companion object {
        // These two bundled artworks are recognized by the packaged model in both
        // v1.4.3 and the current runtime. The white-mold artwork is retained as
        // product artwork but is not a reliable positive inference fixture.
        val knownPositiveFixtures = listOf(
            Fixture(R.drawable.disease_leaf_spot, "leaf-spot"),
            Fixture(R.drawable.disease_mosaic_virus, "mosaic-virus"),
        )
    }
}

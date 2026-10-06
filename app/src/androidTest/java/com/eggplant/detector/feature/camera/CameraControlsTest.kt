package com.eggplant.detector.feature.camera

import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.advanceEventTime
import androidx.compose.ui.test.down
import androidx.compose.ui.test.up
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.eggplant.detector.detection.api.EngineState
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CameraControlsTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun releasingAfterLongPressStopsLivePreview() {
        var starts = 0
        var stops = 0
        var captures = 0

        composeRule.setContent {
            MaterialTheme {
                CameraBottomBar(
                    processing = false,
                    engineState = EngineState.READY,
                    livePreviewActive = false,
                    onGallery = {},
                    onCapture = { captures++ },
                    onStartLivePreview = { starts++ },
                    onStopLivePreview = { stops++ },
                )
            }
        }

        composeRule.onNodeWithContentDescription("Capture scan").performTouchInput {
            down(center)
            advanceEventTime(700)
            up()
        }
        composeRule.waitForIdle()

        assertEquals(1, starts)
        assertEquals(1, stops)
        assertEquals(0, captures)
    }

    @Test
    fun tappingShutterCapturesWithoutStartingLivePreview() {
        var captures = 0
        var starts = 0
        var stops = 0

        composeRule.setContent {
            MaterialTheme {
                CameraBottomBar(
                    processing = false,
                    engineState = EngineState.READY,
                    livePreviewActive = false,
                    onGallery = {},
                    onCapture = { captures++ },
                    onStartLivePreview = { starts++ },
                    onStopLivePreview = { stops++ },
                )
            }
        }

        composeRule.onNodeWithContentDescription("Capture scan").performClick()
        composeRule.waitForIdle()

        assertEquals(1, captures)
        assertEquals(0, starts)
        assertEquals(0, stops)
    }
}

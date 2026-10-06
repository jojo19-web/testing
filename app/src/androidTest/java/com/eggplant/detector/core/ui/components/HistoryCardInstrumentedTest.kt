package com.eggplant.detector.core.ui.components

import android.graphics.Bitmap
import android.graphics.Color
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.eggplant.detector.R
import com.eggplant.detector.core.ui.theme.EggplantDetectorTheme
import com.eggplant.detector.domain.model.ScanCategory
import com.eggplant.detector.domain.model.ScanResult
import java.io.File
import java.time.LocalDateTime
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class HistoryCardInstrumentedTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun historyCardUsesTheSavedScanPhotoWhenAvailable() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val savedPhotoDescription = context.getString(R.string.saved_scan_photo)
        val photo = File.createTempFile("history-card", ".jpg", context.cacheDir)
        val bitmap = Bitmap.createBitmap(32, 32, Bitmap.Config.ARGB_8888)
        bitmap.eraseColor(Color.rgb(18, 120, 60))
        photo.outputStream().use { output ->
            check(bitmap.compress(Bitmap.CompressFormat.JPEG, 90, output))
        }
        bitmap.recycle()

        try {
            val result = ScanResult(
                id = "history-photo",
                name = "Leaf Spot",
                category = ScanCategory.LEAF_DISEASE,
                confidence = 87,
                scannedAt = LocalDateTime.of(2026, 8, 4, 12, 0),
                signs = emptyList(),
                treatment = "",
                diseaseId = "leaf-spot",
                imagePath = photo.absolutePath,
            )
            composeRule.setContent {
                EggplantDetectorTheme {
                    HistoryCard(result = result, onClick = {})
                }
            }
            composeRule.waitUntil(5_000) {
                composeRule.onAllNodesWithContentDescription(savedPhotoDescription, useUnmergedTree = true)
                    .fetchSemanticsNodes()
                    .isNotEmpty()
            }
            composeRule.onNodeWithContentDescription(savedPhotoDescription, useUnmergedTree = true)
                .assertIsDisplayed()
        } finally {
            photo.delete()
        }
    }
}

package com.eggplant.detector.feature.history

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.eggplant.detector.core.ui.theme.EggplantDetectorTheme
import com.eggplant.detector.domain.model.GlobalScan
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class GlobalScanPagerInstrumentedTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun previousAndNextButtonsMoveBetweenGlobalScans() {
        val scans = listOf(
            testScan("scan-a", "Leaf Spot"),
            testScan("scan-b", "Fruit Rot"),
        )
        composeRule.setContent {
            EggplantDetectorTheme {
                GlobalScanDetailPager(
                    scans = scans,
                    initialId = scans.first().id,
                    onBack = {},
                    onReport = { _ -> },
                )
            }
        }

        composeRule.onNodeWithText("1 of 2").assertIsDisplayed()
        composeRule.onNodeWithText("Next").performClick()
        composeRule.onNodeWithText("2 of 2").assertIsDisplayed()
        composeRule.onNodeWithText("Fruit Rot").assertIsDisplayed()
        composeRule.onNodeWithText("Previous").performClick()
        composeRule.onNodeWithText("1 of 2").assertIsDisplayed()
        composeRule.onNodeWithText("Leaf Spot").assertIsDisplayed()
    }

    @Test
    fun annotatedAndOriginalViewsAreAvailableWhenAnAnnotatedPhotoExists() {
        val scan = testScan("scan-annotated", "Leaf Spot").copy(
            photoPath = "/missing-original.jpg",
            annotatedPhotoPath = "/missing-annotated.jpg",
        )
        composeRule.setContent {
            EggplantDetectorTheme {
                GlobalScanDetailPager(
                    scans = listOf(scan),
                    initialId = scan.id,
                    onBack = {},
                    onReport = { _ -> },
                )
            }
        }

        composeRule.onNodeWithText("Annotated").assertIsDisplayed()
        composeRule.onNodeWithText("Original").assertIsDisplayed()
        composeRule.onNodeWithText("AI screening").assertIsDisplayed()
        composeRule.onNodeWithText("Original").performClick()
        composeRule.onNodeWithText("Original").assertIsDisplayed()
    }

    private fun testScan(id: String, name: String) = GlobalScan(
        id = id,
        diseaseId = id,
        diseaseName = name,
        confidence = 87,
        photoPath = null,
        publishedAt = "2026-08-03T00:00:00Z",
        symptoms = emptyList(),
        causes = "",
        prevention = "",
        guidance = "",
        whenToAct = "",
        disclaimer = "",
        references = emptyList(),
    )
}

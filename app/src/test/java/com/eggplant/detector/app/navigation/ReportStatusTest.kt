package com.eggplant.detector.app.navigation

import org.junit.Assert.assertEquals
import org.junit.Test

class ReportStatusTest {
    @Test
    fun selfReportExplainsWhyTheReportWasNotAccepted() {
        assertEquals(
            "You cannot report a scan that you shared yourself." to true,
            reportFailureStatus("self_report"),
        )
    }

    @Test
    fun unknownFailureKeepsAHelpfulRetryMessage() {
        assertEquals(
            "Report could not be sent. Try again." to true,
            reportFailureStatus("unexpected_error"),
        )
    }
}

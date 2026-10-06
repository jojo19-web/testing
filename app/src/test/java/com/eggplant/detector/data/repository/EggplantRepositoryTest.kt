package com.eggplant.detector.data.repository

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EggplantRepositoryTest {
    @Test
    fun `bundled catalog seeds only an empty local catalog`() {
        assertTrue(shouldSeedBundledCatalog(0))
        assertFalse(shouldSeedBundledCatalog(1))
        assertFalse(shouldSeedBundledCatalog(8))
    }

    @Test
    fun `global sharing accepts live capture and gallery sources`() {
        assertTrue(isGlobalShareSource("live"))
        assertTrue(isGlobalShareSource("capture"))
        assertTrue(isGlobalShareSource("gallery"))
        assertFalse(isGlobalShareSource("unknown"))
    }
}

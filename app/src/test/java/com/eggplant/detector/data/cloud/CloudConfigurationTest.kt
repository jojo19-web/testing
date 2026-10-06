package com.eggplant.detector.data.cloud

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CloudConfigurationTest {
    private val offline = CloudConfiguration(
        apiBaseUrl = "https://eggplant-disease-admin.vercel.app",
        supabaseUrl = "https://example.supabase.co",
        publishableKey = "",
    )

    @Test
    fun `bootstrap response resolves a configured public client`() {
        val resolved = cloudConfigurationFromBootstrap(
            offline,
            buildJsonObject {
                put("supabaseUrl", "https://example.supabase.co/")
                put("publishableKey", "sb_publishable_test")
            },
        )

        assertTrue(resolved?.isConfigured == true)
        assertEquals("https://example.supabase.co", resolved?.supabaseUrl)
        assertEquals("sb_publishable_test", resolved?.publishableKey)
    }

    @Test
    fun `bootstrap response rejects missing or insecure values`() {
        assertNull(cloudConfigurationFromBootstrap(offline, buildJsonObject { put("supabaseUrl", "https://example.supabase.co") }))
        assertNull(
            cloudConfigurationFromBootstrap(
                offline,
                buildJsonObject {
                    put("supabaseUrl", "http://example.supabase.co")
                    put("publishableKey", "key")
                },
            ),
        )
        assertFalse(offline.isConfigured)
    }

    @Test
    fun `anonymous auth uses the Supabase anonymous signup payload`() {
        val payload = anonymousAuthPayload()

        assertTrue(payload["data"]?.jsonObject?.isEmpty() == true)
    }
}

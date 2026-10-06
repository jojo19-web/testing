package com.eggplant.detector.core.ui.components

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.eggplant.detector.R
import com.eggplant.detector.domain.model.ScanResult
import com.eggplant.detector.core.formatting.ConfidenceFormatter
import com.eggplant.detector.core.formatting.DateFormatter
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private const val HISTORY_THUMBNAIL_MAX_DIMENSION = 320

@Composable
fun HistoryCard(result: ScanResult, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val description = stringResource(R.string.open_history_details, result.name)
    Card(
        modifier = modifier
            .fillMaxWidth()
            .semantics { contentDescription = description }
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            HistoryThumbnail(result)
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(result.name, style = MaterialTheme.typography.titleMedium)
                Text(
                    when (result.category) {
                        com.eggplant.detector.domain.model.ScanCategory.LEAF_DISEASE -> stringResource(R.string.leaf_disease)
                        com.eggplant.detector.domain.model.ScanCategory.FRUIT_DISEASE -> stringResource(R.string.fruit_disease)
                        com.eggplant.detector.domain.model.ScanCategory.NO_DISEASE_DETECTED -> localized("Healthy", "Malusog")
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.secondary,
                )
                Text(
                    stringResource(R.string.confidence_value, ConfidenceFormatter.format(result.confidence)),
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    DateFormatter.format(result.scannedAt),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, null)
        }
    }
}

@Composable
private fun HistoryThumbnail(result: ScanResult) {
    val bitmap by produceState<Bitmap?>(initialValue = null, result.imagePath) {
        value = withContext(Dispatchers.IO) {
            result.imagePath
                ?.let(::File)
                ?.takeIf(File::isFile)
                ?.let(::decodeHistoryThumbnail)
        }
    }
    val savedBitmap = bitmap
    val thumbnailModifier = Modifier
        .size(width = 92.dp, height = 78.dp)
        .clip(RoundedCornerShape(12.dp))
    if (savedBitmap != null) {
        Image(
            savedBitmap.asImageBitmap(),
            contentDescription = stringResource(R.string.saved_scan_photo),
            modifier = thumbnailModifier,
            contentScale = ContentScale.Crop,
        )
    } else {
        ResultArtwork(
            category = result.category,
            name = result.name,
            modifier = thumbnailModifier,
            diseaseId = result.diseaseId,
        )
    }
}

private fun decodeHistoryThumbnail(file: File): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.absolutePath, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

    var sampleSize = 1
    while (maxOf(bounds.outWidth / sampleSize, bounds.outHeight / sampleSize) > HISTORY_THUMBNAIL_MAX_DIMENSION) {
        sampleSize *= 2
    }
    return BitmapFactory.decodeFile(
        file.absolutePath,
        BitmapFactory.Options().apply { inSampleSize = sampleSize },
    )
}

@Composable
private fun localized(english: String, filipino: String): String {
    val language = androidx.compose.ui.platform.LocalConfiguration.current.locales[0].language
    return if (language == "fil" || language == "tl") filipino else english
}

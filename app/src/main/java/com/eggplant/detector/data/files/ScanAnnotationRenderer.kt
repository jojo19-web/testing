package com.eggplant.detector.data.files

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import com.eggplant.detector.domain.model.ScanResult
import kotlin.math.roundToInt

/**
 * Renders the share-time image variant. The source image is decoded only for
 * this derived copy; the raw scan remains untouched and is still used for
 * share revalidation and the Original view.
 */
internal object ScanAnnotationRenderer {
    fun render(
        source: java.io.File,
        destination: java.io.File,
        result: ScanResult,
        publishedConfidence: Float,
    ) {
        val decoded = decode(source)
        val annotated = try {
            checkNotNull(decoded.copy(Bitmap.Config.ARGB_8888, true)) {
                "Could not create an annotated scan image."
            }
        } finally {
            decoded.recycle()
        }

        try {
            drawAnnotations(annotated, result, publishedConfidence)
            destination.parentFile?.mkdirs()
            destination.outputStream().use { output ->
                check(annotated.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, output)) {
                    "Could not encode the annotated scan image."
                }
            }
        } finally {
            annotated.recycle()
        }
    }

    private fun decode(source: java.io.File): Bitmap {
        check(source.isFile) { "The scan image is unavailable." }
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(source.absolutePath, bounds)
        check(bounds.outWidth > 0 && bounds.outHeight > 0) {
            "The scan image is not decodable."
        }
        var sampleSize = 1
        while (maxOf(bounds.outWidth / sampleSize, bounds.outHeight / sampleSize) > MAX_RENDER_DIMENSION) {
            sampleSize *= 2
        }
        return checkNotNull(
            BitmapFactory.decodeFile(
                source.absolutePath,
                BitmapFactory.Options().apply {
                    inPreferredConfig = Bitmap.Config.ARGB_8888
                    inSampleSize = sampleSize
                },
            ),
        ) { "The scan image could not be decoded." }
    }

    private fun drawAnnotations(bitmap: Bitmap, result: ScanResult, publishedConfidence: Float) {
        val canvas = Canvas(bitmap)
        val minimumDimension = minOf(bitmap.width, bitmap.height).toFloat()
        val textSize = (minimumDimension * 0.026f).coerceIn(MIN_TEXT_SIZE, MAX_TEXT_SIZE)
        val labelPadding = textSize * 0.34f
        val gap = textSize * 0.28f
        val margin = textSize * 0.45f
        val cornerRadius = textSize * 0.38f
        val strokeWidth = (textSize * 0.12f).coerceIn(2f, 6f)
        val boxColor = Color.rgb(53, 184, 84)

        val boxPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = boxColor
            style = Paint.Style.STROKE
            this.strokeWidth = strokeWidth
        }
        val labelBackgroundPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = boxColor
            style = Paint.Style.FILL
        }
        val labelTextPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.FILL
            this.textSize = textSize
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        }

        result.detections.forEach { detection ->
            val bounds = RectF(
                detection.bounds.left * bitmap.width,
                detection.bounds.top * bitmap.height,
                detection.bounds.right * bitmap.width,
                detection.bounds.bottom * bitmap.height,
            )
            canvas.drawRoundRect(bounds, cornerRadius, cornerRadius, boxPaint)
            drawLabel(
                canvas = canvas,
                text = "${detection.name.ifBlank { result.name }} ${detection.confidence.coerceIn(0, 100)}%",
                anchor = bounds,
                textPaint = labelTextPaint,
                backgroundPaint = labelBackgroundPaint,
                textSize = textSize,
                padding = labelPadding,
                gap = gap,
                margin = margin,
                cornerRadius = cornerRadius,
            )
        }

        val screeningTextSize = (textSize * 0.72f).coerceIn(10f, 24f)
        val screeningTextPaint = Paint(labelTextPaint).apply {
            this.textSize = screeningTextSize
        }
        val screeningBackgroundPaint = Paint(labelBackgroundPaint).apply {
            color = Color.argb(218, 24, 29, 34)
        }
        drawLabel(
            canvas = canvas,
            text = "AI screening • ${(publishedConfidence * 100f).roundToInt().coerceIn(0, 100)}%",
            anchor = RectF(margin, margin, margin, margin),
            textPaint = screeningTextPaint,
            backgroundPaint = screeningBackgroundPaint,
            textSize = screeningTextPaint.textSize,
            padding = labelPadding * 0.8f,
            gap = 0f,
            margin = margin,
            cornerRadius = cornerRadius,
            forceBelow = false,
        )
    }

    private fun drawLabel(
        canvas: Canvas,
        text: String,
        anchor: RectF,
        textPaint: Paint,
        backgroundPaint: Paint,
        textSize: Float,
        padding: Float,
        gap: Float,
        margin: Float,
        cornerRadius: Float,
        forceBelow: Boolean = false,
    ) {
        val bitmapWidth = canvas.width.toFloat()
        val bitmapHeight = canvas.height.toFloat()
        val maximumWidth = (bitmapWidth - 2f * margin).coerceAtLeast(textSize + 2f * padding)
        val availableTextWidth = (maximumWidth - 2f * padding).coerceAtLeast(1f)
        val fittedText = if (textPaint.measureText(text) <= availableTextWidth) {
            text
        } else {
            val characterCount = textPaint.breakText(text, true, availableTextWidth, null)
            text.take(characterCount.coerceAtLeast(1)).trimEnd() + "…"
        }
        val labelWidth = (textPaint.measureText(fittedText) + 2f * padding).coerceAtMost(maximumWidth)
        val fontMetrics = textPaint.fontMetrics
        val labelHeight = fontMetrics.bottom - fontMetrics.top + 2f * padding
        val left = anchor.left.coerceIn(margin, (bitmapWidth - labelWidth - margin).coerceAtLeast(margin))
        val top = if (!forceBelow && anchor.top >= labelHeight + gap + margin) {
            anchor.top - labelHeight - gap
        } else {
            anchor.bottom + gap
        }.coerceIn(margin, (bitmapHeight - labelHeight - margin).coerceAtLeast(margin))
        val labelRect = RectF(left, top, left + labelWidth, top + labelHeight)
        canvas.drawRoundRect(labelRect, cornerRadius, cornerRadius, backgroundPaint)
        canvas.drawText(
            fittedText,
            labelRect.left + padding,
            labelRect.top + padding - fontMetrics.top,
            textPaint,
        )
    }

    private const val JPEG_QUALITY = 88
    private const val MAX_RENDER_DIMENSION = 2_048
    private const val MIN_TEXT_SIZE = 13f
    private const val MAX_TEXT_SIZE = 42f
}

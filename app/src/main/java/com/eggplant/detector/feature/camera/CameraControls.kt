package com.eggplant.detector.feature.camera

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.outlined.Collections
import androidx.compose.material.icons.outlined.FlashOff
import androidx.compose.material.icons.outlined.FlashOn
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.onLongClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.input.pointer.pointerInput
import com.eggplant.detector.R
import com.eggplant.detector.detection.api.DetectionStatus
import com.eggplant.detector.detection.api.EngineState

@Composable
internal fun CameraTopBar(state: CameraAnalysisState, onBack: () -> Unit, onToggleTorch: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        CameraControl(Icons.AutoMirrored.Outlined.ArrowBack, stringResource(R.string.close_camera), onBack)
        if (state.torchSupported) {
            CameraControl(
                if (state.torchEnabled) Icons.Outlined.FlashOn else Icons.Outlined.FlashOff,
                stringResource(if (state.torchEnabled) R.string.turn_flash_off else R.string.turn_flash_on),
                onToggleTorch,
            )
        } else {
            Spacer(Modifier.size(52.dp))
        }
    }
}

@Composable
internal fun CameraStatus(state: CameraAnalysisState, modifier: Modifier = Modifier) {
    val text = when {
        state.error != null -> state.error
        state.qualityHint == FrameQualityHint.LOW_LIGHT -> stringResource(R.string.quality_low_light)
        state.qualityHint == FrameQualityHint.OVEREXPOSED -> stringResource(R.string.quality_overexposed)
        state.qualityHint == FrameQualityHint.HOLD_STEADY -> stringResource(R.string.quality_hold_steady)
        state.qualityHint == FrameQualityHint.TOO_CLOSE -> stringResource(R.string.quality_too_close)
        state.engineState == EngineState.UNINITIALIZED -> stringResource(R.string.loading_model)
        state.engineState != EngineState.READY -> stringResource(R.string.detection_unavailable)
        state.isStillImageProcessing -> stringResource(R.string.analyzing)
        state.livePreviewActive && state.status == DetectionStatus.HEALTHY -> stringResource(R.string.live_preview_healthy)
        state.livePreviewActive && state.status == DetectionStatus.DISEASE_DETECTED -> stringResource(R.string.live_preview_disease)
        state.livePreviewActive -> stringResource(R.string.live_preview_active)
        state.status == DetectionStatus.HEALTHY -> stringResource(R.string.no_disease_detected)
        else -> stringResource(R.string.point_camera)
    }
    Surface(modifier = modifier.padding(horizontal = 24.dp), color = Color.Black.copy(alpha = .62f), shape = RoundedCornerShape(18.dp)) {
        Text(text, Modifier.padding(horizontal = 16.dp, vertical = 10.dp), color = Color.White)
    }
}

@Composable
internal fun CameraBottomBar(
    processing: Boolean,
    engineState: EngineState,
    livePreviewActive: Boolean,
    onGallery: () -> Unit,
    onCapture: () -> Unit,
    onStartLivePreview: () -> Unit,
    onStopLivePreview: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val captureDescription = stringResource(R.string.capture_scan)
    val livePreviewDescription = stringResource(R.string.hold_for_live_preview)
    val shutterCoordinator = remember { ShutterActionCoordinator() }
    val currentOnCapture by rememberUpdatedState(onCapture)
    val currentOnStartLivePreview by rememberUpdatedState(onStartLivePreview)
    val currentOnStopLivePreview by rememberUpdatedState(onStopLivePreview)
    var isPressed by remember { mutableStateOf(false) }
    val shutterScale by animateFloatAsState(
        targetValue = if (isPressed) 0.92f else 1f,
        animationSpec = tween(durationMillis = 120),
        label = "shutterScale",
    )
    Row(
        modifier = modifier.fillMaxWidth().background(Color.Black.copy(alpha = .55f)).padding(horizontal = 22.dp, vertical = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        CameraControl(
            Icons.Outlined.Collections,
            stringResource(R.string.choose_gallery),
            onGallery,
            enabled = !processing && engineState == EngineState.READY && !livePreviewActive,
        )
        Surface(
            modifier = Modifier
                .size(76.dp)
                .graphicsLayer {
                    scaleX = shutterScale
                    scaleY = shutterScale
                }
                .border(4.dp, Color.White.copy(alpha = .7f), CircleShape)
                .pointerInput(processing, engineState) {
                    if (!processing && engineState == EngineState.READY) {
                        detectTapGestures(
                            onPress = {
                                isPressed = true
                                tryAwaitRelease()
                                isPressed = false
                                if (shutterCoordinator.onPressedChanged(false) == ShutterAction.STOP_LIVE_PREVIEW) {
                                    currentOnStopLivePreview()
                                }
                            },
                            onTap = {
                                if (shutterCoordinator.onTap(processing, engineState) == ShutterAction.CAPTURE) {
                                    currentOnCapture()
                                }
                            },
                            onLongPress = {
                                if (shutterCoordinator.onLongPress(processing, engineState) == ShutterAction.START_LIVE_PREVIEW) {
                                    currentOnStartLivePreview()
                                }
                            },
                        )
                    }
                }
                .semantics {
                    role = Role.Button
                    contentDescription = captureDescription
                    onClick(captureDescription) {
                        if (shutterCoordinator.onTap(processing, engineState) == ShutterAction.CAPTURE) {
                            onCapture()
                            true
                        } else {
                            false
                        }
                    }
                    onLongClick(livePreviewDescription) {
                        if (shutterCoordinator.onLongPress(processing, engineState) == ShutterAction.START_LIVE_PREVIEW) {
                            onStartLivePreview()
                            true
                        } else {
                            false
                        }
                    }
                },
            color = if (livePreviewActive) MaterialTheme.colorScheme.primary else Color.White,
            contentColor = if (livePreviewActive) Color.White else MaterialTheme.colorScheme.primary,
            shape = CircleShape,
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.CameraAlt, contentDescription = null, modifier = Modifier.size(34.dp))
            }
        }
        Spacer(Modifier.size(52.dp))
    }
}

@Composable
internal fun CameraPermissionRequired(permissionRequested: Boolean, onRequest: () -> Unit, onGallery: () -> Unit, onBack: () -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(28.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(stringResource(R.string.camera_permission_required), style = MaterialTheme.typography.headlineSmall)
        Text(
            stringResource(if (permissionRequested) R.string.camera_permission_retry else R.string.camera_permission_body),
            modifier = Modifier.padding(vertical = 16.dp),
        )
        Button(onClick = onRequest) { Text(stringResource(R.string.allow_camera)) }
        androidx.compose.material3.OutlinedButton(onClick = onGallery, modifier = Modifier.padding(top = 10.dp)) {
            Icon(Icons.Outlined.Collections, contentDescription = null)
            Text("  ${stringResource(R.string.choose_gallery)}")
        }
        Text(
            stringResource(R.string.gallery_no_camera_permission),
            modifier = Modifier.padding(top = 12.dp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.back)) }
    }
}

@Composable
private fun CameraControl(icon: ImageVector, description: String, onClick: () -> Unit, enabled: Boolean = true) {
    Surface(color = Color.Black.copy(alpha = .45f), shape = CircleShape) {
        IconButton(onClick = onClick, enabled = enabled, modifier = Modifier.size(52.dp)) {
            Icon(icon, contentDescription = description, tint = Color.White)
        }
    }
}

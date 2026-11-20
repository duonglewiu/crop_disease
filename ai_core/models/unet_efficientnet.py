"""
Kiến trúc mô hình Phân đoạn Vết Bệnh (Severity Segmentation) sử dụng U-Net với EfficientNet-B0 Encoder.
Đo diện tích điểm ảnh nhiễm bệnh và tính % mức độ tổn thương (Severity).
"""

import torch
import torch.nn as nn
import segmentation_models_pytorch as smp

class UNetSeveritySegmentor(nn.Module):
    def __init__(self, in_channels: int = 3, classes: int = 1, encoder_name: str = "efficientnet-b0"):
        super().__init__()
        self.model = smp.Unet(
            encoder_name=encoder_name,
            encoder_weights="imagenet",
            in_channels=in_channels,
            classes=classes,
            activation="sigmoid"
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)

    def calculate_severity_percentage(self, pred_mask: torch.Tensor, leaf_mask: torch.Tensor = None) -> float:
        """
        Tính toán tỷ lệ % diện tích tổn thương (Severity):
        Severity % = (Số pixel vết bệnh / Tổng số pixel phiến lá) * 100
        """
        binary_pred = (pred_mask > 0.5).float()
        if leaf_mask is not None:
            lesion_pixels = (binary_pred * leaf_mask).sum().item()
            total_leaf_pixels = leaf_mask.sum().item()
            if total_leaf_pixels == 0:
                return 0.0
            return (lesion_pixels / total_leaf_pixels) * 100.0
        else:
            lesion_pixels = binary_pred.sum().item()
            total_pixels = binary_pred.numel()
            return (lesion_pixels / total_pixels) * 100.0


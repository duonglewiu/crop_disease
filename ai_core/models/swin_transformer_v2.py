"""
Kiến trúc mô hình Phân loại Bệnh Cây Trồng sử dụng Swin Transformer V2 (timm).
Hỗ trợ Test-Time Augmentation (TTA) khi suy luận.
"""

import torch
import torch.nn as nn
import timm

class SwinV2CropClassifier(nn.Module):
    def __init__(self, num_classes: int = 38, pretrained: bool = True):
        super().__init__()
        # Backbone Swin Transformer V2 Tiny / Small
        self.backbone = timm.create_model(
            'swinv2_tiny_window16_256',
            pretrained=pretrained,
            num_classes=num_classes
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def forward_tta(self, x: torch.Tensor) -> torch.Tensor:
        """
        Test-Time Augmentation (TTA):
        Lấy trung bình kết quả dự đoán giữa ảnh gốc và ảnh lật ngang, lật dọc.
        """
        orig_preds = torch.softmax(self.forward(x), dim=-1)
        
        # Horizontal flip
        h_flip = torch.flip(x, dims=[3])
        h_preds = torch.softmax(self.forward(h_flip), dim=-1)
        
        # Vertical flip
        v_flip = torch.flip(x, dims=[2])
        v_preds = torch.softmax(self.forward(v_flip), dim=-1)

        # Trung bình cộng xác suất
        avg_preds = (orig_preds + h_preds + v_preds) / 3.0
        return avg_preds


"""
Pipeline huấn luyện mạng U-Net (EfficientNet-B0 Encoder) phân đoạn vết bệnh (Tuần 2.2).
"""

import torch
import torch.nn as nn
from ai_core.models.unet_efficientnet import UNetSeveritySegmentor

class DiceBCELoss(nn.Module):
    def __init__(self, weight=None, size_average=True):
        super(DiceBCELoss, self).__init__()

    def forward(self, inputs, targets, smooth=1):
        bce = nn.functional.binary_cross_entropy(inputs, targets, reduction='mean')
        intersection = (inputs * targets).sum()
        dice = (2. * intersection + smooth) / (inputs.sum() + targets.sum() + smooth)
        return bce + (1.0 - dice)

if __name__ == "__main__":
    print("Khởi chạy huấn luyện U-Net phân đoạn vết bệnh...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Thiết bị sử dụng: {device}")


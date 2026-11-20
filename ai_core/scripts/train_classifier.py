"""
Pipeline huấn luyện Swin Transformer V2 cho phân loại bệnh cây trồng (Tuần 2.1).
"""

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from ai_core.models.swin_transformer_v2 import SwinV2CropClassifier

def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
    return total_loss / len(loader), correct / total

if __name__ == "__main__":
    print("Khởi chạy huấn luyện Swin Transformer V2...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Thiết bị sử dụng: {device}")


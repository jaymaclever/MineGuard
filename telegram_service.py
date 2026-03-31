import os
import requests
from typing import Dict, Any

def send_telegram_alert(report_data: Dict[str, Any]):
    """
    Envia alertas para o Telegram com base na gravidade do relatório.
    
    Args:
        report_data (dict): Dados do relatório contendo:
            - agente_mecanografico (str)
            - local (str)
            - tipo (str)
            - gravidade (str): 'G1', 'G2', 'G3', 'G4'
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Erro: TELEGRAM_BOT_TOKEN não configurado.")
        return

    # A API do Telegram usa HTTPS (Porta 443) por padrão.
    base_url = f"https://api.telegram.org/bot{token}/sendMessage"
    
    agente_mecanografico = report_data.get('agente_mecanografico', 'N/A')
    local = report_data.get('local', 'Local não especificado')
    tipo = report_data.get('tipo', 'Tipo não especificado')
    gravidade = report_data.get('gravidade', 'G1')
    
    # Formatação da mensagem
    message = (
        f"<b>Relatório de Segurança - Mina</b>\n"
        f"--------------------------------\n"
        f"👤 <b>Agente (Mec.):</b> {agente_mecanografico}\n"
        f"📍 <b>Local:</b> {local}\n"
        f"📂 <b>Tipo:</b> {tipo}\n"
        f"⚠️ <b>Gravidade:</b> {gravidade}"
    )
    
    targets = []
    
    if gravidade == 'G3':
        # Enviar para o grupo de Oficiais e Sierras
        group_id = os.getenv("TELEGRAM_GROUP_OFICIAIS_SIERRAS_ID")
        if group_id:
            targets.append(group_id)
            
    elif gravidade == 'G4':
        # Alerta urgente para Sierra 1 e Sierra 2
        message = f"🚨 <b>ALERTA URGENTE G4</b> 🚨\n\n{message}"
        sierra1_id = os.getenv("TELEGRAM_SIERRA_1_CHAT_ID")
        sierra2_id = os.getenv("TELEGRAM_SIERRA_2_CHAT_ID")
        
        if sierra1_id: targets.append(sierra1_id)
        if sierra2_id: targets.append(sierra2_id)
        
    # Envio das mensagens
    for chat_id in targets:
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML"
        }
        
        try:
            # O uso de 'https://' garante a saída pela porta 443 (HTTPS)
            response = requests.post(base_url, json=payload, timeout=10)
            response.raise_for_status()
            print(f"Alerta enviado com sucesso para {chat_id}")
        except requests.exceptions.RequestException as e:
            print(f"Erro ao enviar alerta para {chat_id}: {e}")

# Exemplo de uso:
# report = {
#     'agente_mecanografico': 'M-2055',
#     'local': 'Setor Norte - Rampa 3',
#     'tipo': 'Intrusão de Perímetro',
#     'gravidade': 'G4'
# }
# send_telegram_alert(report)

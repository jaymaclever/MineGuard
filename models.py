from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Enum, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import datetime

Base = declarative_base()

class NivelHierarquico(str):
    SUPERADMIN = "Superadmin"
    SIERRA_1 = "Sierra 1"
    SIERRA_2 = "Sierra 2"
    OFICIAL = "Oficial"
    SUPERVISOR = "Supervisor"
    AGENTE = "Agente"

class CategoriaRelatorio(str):
    VALORES = "Valores"
    PERIMETRO = "Perímetro"
    LOGISTICA = "Logística"
    SAFETY = "Safety"
    MANUTENCAO = "Manutenção"
    INFORMATIVO = "Informativo"
    OPERATIVO = "Operativo"

class Gravidade(str):
    G1 = "G1"
    G2 = "G2"
    G3 = "G3"
    G4 = "G4"

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), nullable=False)
    funcao = Column(String(100), nullable=False)
    numero_mecanografico = Column(String(50), unique=True, nullable=False)
    nivel_hierarquico = Column(String(20), nullable=False) # Superadmin, Admin, Sierra 1, etc.
    
    reports = relationship("Report", back_populates="agente")

class RoleWeight(Base):
    __tablename__ = 'role_weights'
    nivel_hierarquico = Column(String(20), primary_key=True)
    peso = Column(Integer, nullable=False)

class Report(Base):
    __tablename__ = 'reports'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    agente_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    categoria = Column(String(20), nullable=False)
    gravidade = Column(String(5), nullable=False)
    descricao = Column(Text, nullable=False)
    fotos_path = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    agente = relationship("User", back_populates="reports")

class Permission(Base):
    __tablename__ = 'permissions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nivel_hierarquico = Column(String(20), nullable=False)
    permissao_nome = Column(String(100), nullable=False)
    is_enabled = Column(Boolean, default=True)

class SystemSetting(Base):
    __tablename__ = 'system_settings'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=False) # Valor encriptado
    description = Column(Text)

# Exemplo de uso:
# engine = create_engine('sqlite:///mina_seguranca.db')
# Base.metadata.create_all(engine)

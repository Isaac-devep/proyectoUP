-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 26-02-2026 a las 02:35:35
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `proyecto`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admin`
--

CREATE TABLE `admin` (
  `id_rol` varchar(20) NOT NULL,
  `id_etiqueta` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `empleado`
--

CREATE TABLE `empleado` (
  `id_rol` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `etiqueta`
--

CREATE TABLE `etiqueta` (
  `id_etiqueta` varchar(20) NOT NULL,
  `p.advertencia` text NOT NULL,
  `inf.cas` varchar(20) NOT NULL,
  `fecha` datetime NOT NULL,
  `id_producto` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `etiquetas_frases_h`
--

CREATE TABLE `etiquetas_frases_h` (
  `id_etiqueta` varchar(20) NOT NULL,
  `id_h` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `etiquetas_frases_p`
--

CREATE TABLE `etiquetas_frases_p` (
  `id_etiqueta` varchar(20) NOT NULL,
  `id_p` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `etiqueta_pictograma`
--

CREATE TABLE `etiqueta_pictograma` (
  `id_etiqueta` varchar(20) NOT NULL,
  `id_picto` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fds`
--

CREATE TABLE `fds` (
  `id_fds` varchar(20) NOT NULL,
  `proveedor` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `frases_h`
--

CREATE TABLE `frases_h` (
  `id_h` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `descripcion` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `frases_p`
--

CREATE TABLE `frases_p` (
  `id_p` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `descripcion` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pictograma`
--

CREATE TABLE `pictograma` (
  `id_picto` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `imagen` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pro`
--

CREATE TABLE `pro` (
  `id_producto` varchar(20) NOT NULL,
  `nombre` text NOT NULL,
  `id_fds` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recipiente`
--

CREATE TABLE `recipiente` (
  `id_recipiente` varchar(20) NOT NULL,
  `tipo` varchar(20) NOT NULL,
  `tamaño` int(20) NOT NULL,
  `id_etiqueta` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol`
--

CREATE TABLE `rol` (
  `id_rol` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rol`
--

INSERT INTO `rol` (`id_rol`) VALUES
('Administrador'),
('Empleado'),
('Super administrador');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `superadmin`
--

CREATE TABLE `superadmin` (
  `id_rol` varchar(20) NOT NULL,
  `id_usuario` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` varchar(20) NOT NULL,
  `usu` varchar(40) NOT NULL,
  `contra` text NOT NULL,
  `correo` varchar(50) NOT NULL,
  `nombre` text NOT NULL,
  `apellido` text NOT NULL,
  `id_rol` varchar(20) NOT NULL,
  `estado` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `usu`, `contra`, `correo`, `nombre`, `apellido`, `id_rol`, `estado`) VALUES
('1014152276', 'Gaby.', 'saramajo', 'gaby@gmail.com', 'Gabriela', 'Yela', 'Empleado', 'activo'),
('123123123', 'admin', 'admin', 'admin@admin.com', 'cristian', 'albor', 'Administrador', 'activo'),
('12317777', 'emp', 'emp', 'empleado@gmail.com', 'hola', 'hola', 'Empleado', 'activo'),
('12345', 'cralbor', 'imthebest', 'calborparra@gmail.com', 'Cristian', 'Albor', 'Super administrador', 'active'),
('23123213213', 'ejemplo', 'ejemplo', 'ejemplo@gmail.com', 'ejemplo', 'hola', 'Administrador', 'activo');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id_rol`,`id_etiqueta`),
  ADD KEY `id_etiqueta` (`id_etiqueta`);

--
-- Indices de la tabla `empleado`
--
ALTER TABLE `empleado`
  ADD PRIMARY KEY (`id_rol`);

--
-- Indices de la tabla `etiqueta`
--
ALTER TABLE `etiqueta`
  ADD PRIMARY KEY (`id_etiqueta`),
  ADD KEY `id_producto` (`id_producto`);

--
-- Indices de la tabla `etiquetas_frases_h`
--
ALTER TABLE `etiquetas_frases_h`
  ADD PRIMARY KEY (`id_etiqueta`,`id_h`),
  ADD KEY `id_h` (`id_h`);

--
-- Indices de la tabla `etiquetas_frases_p`
--
ALTER TABLE `etiquetas_frases_p`
  ADD PRIMARY KEY (`id_etiqueta`,`id_p`),
  ADD KEY `id_p` (`id_p`);

--
-- Indices de la tabla `etiqueta_pictograma`
--
ALTER TABLE `etiqueta_pictograma`
  ADD PRIMARY KEY (`id_etiqueta`,`id_picto`),
  ADD KEY `id_picto` (`id_picto`);

--
-- Indices de la tabla `fds`
--
ALTER TABLE `fds`
  ADD PRIMARY KEY (`id_fds`);

--
-- Indices de la tabla `frases_h`
--
ALTER TABLE `frases_h`
  ADD PRIMARY KEY (`id_h`);

--
-- Indices de la tabla `frases_p`
--
ALTER TABLE `frases_p`
  ADD PRIMARY KEY (`id_p`);

--
-- Indices de la tabla `pictograma`
--
ALTER TABLE `pictograma`
  ADD PRIMARY KEY (`id_picto`);

--
-- Indices de la tabla `pro`
--
ALTER TABLE `pro`
  ADD PRIMARY KEY (`id_producto`),
  ADD KEY `id_fds` (`id_fds`);

--
-- Indices de la tabla `recipiente`
--
ALTER TABLE `recipiente`
  ADD PRIMARY KEY (`id_recipiente`,`id_etiqueta`),
  ADD KEY `id_etiqueta` (`id_etiqueta`);

--
-- Indices de la tabla `rol`
--
ALTER TABLE `rol`
  ADD PRIMARY KEY (`id_rol`);

--
-- Indices de la tabla `superadmin`
--
ALTER TABLE `superadmin`
  ADD PRIMARY KEY (`id_rol`,`id_usuario`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `correo` (`correo`),
  ADD KEY `id_rol` (`id_rol`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `frases_h`
--
ALTER TABLE `frases_h`
  MODIFY `id_h` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `frases_p`
--
ALTER TABLE `frases_p`
  MODIFY `id_p` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pictograma`
--
ALTER TABLE `pictograma`
  MODIFY `id_picto` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `admin`
--
ALTER TABLE `admin`
  ADD CONSTRAINT `admin_ibfk_1` FOREIGN KEY (`id_etiqueta`) REFERENCES `etiqueta` (`id_etiqueta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `empleado`
--
ALTER TABLE `empleado`
  ADD CONSTRAINT `empleado_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `etiqueta`
--
ALTER TABLE `etiqueta`
  ADD CONSTRAINT `etiqueta_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `pro` (`id_producto`);

--
-- Filtros para la tabla `etiquetas_frases_h`
--
ALTER TABLE `etiquetas_frases_h`
  ADD CONSTRAINT `etiquetas_frases_h_ibfk_1` FOREIGN KEY (`id_etiqueta`) REFERENCES `etiqueta` (`id_etiqueta`) ON DELETE CASCADE,
  ADD CONSTRAINT `etiquetas_frases_h_ibfk_2` FOREIGN KEY (`id_h`) REFERENCES `frases_h` (`id_h`);

--
-- Filtros para la tabla `etiquetas_frases_p`
--
ALTER TABLE `etiquetas_frases_p`
  ADD CONSTRAINT `etiquetas_frases_p_ibfk_1` FOREIGN KEY (`id_etiqueta`) REFERENCES `etiqueta` (`id_etiqueta`) ON DELETE CASCADE,
  ADD CONSTRAINT `etiquetas_frases_p_ibfk_2` FOREIGN KEY (`id_p`) REFERENCES `frases_p` (`id_p`);

--
-- Filtros para la tabla `etiqueta_pictograma`
--
ALTER TABLE `etiqueta_pictograma`
  ADD CONSTRAINT `etiqueta_pictograma_ibfk_1` FOREIGN KEY (`id_etiqueta`) REFERENCES `etiqueta` (`id_etiqueta`) ON DELETE CASCADE,
  ADD CONSTRAINT `etiqueta_pictograma_ibfk_2` FOREIGN KEY (`id_picto`) REFERENCES `pictograma` (`id_picto`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pro`
--
ALTER TABLE `pro`
  ADD CONSTRAINT `pro_ibfk_1` FOREIGN KEY (`id_fds`) REFERENCES `fds` (`id_fds`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `recipiente`
--
ALTER TABLE `recipiente`
  ADD CONSTRAINT `recipiente_ibfk_1` FOREIGN KEY (`id_etiqueta`) REFERENCES `etiqueta` (`id_etiqueta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `superadmin`
--
ALTER TABLE `superadmin`
  ADD CONSTRAINT `superadmin_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `superadmin_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

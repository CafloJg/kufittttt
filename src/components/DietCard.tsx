import React, { useState } from 'react';
import { Box, Card, CardHeader, CardContent, Typography, IconButton, Tooltip, Button, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { useDietContext } from '../context/DietContext';
import type { Meal } from '../types/user';

const DietCard = ({ meal, isCompleted, onMealClick }) => {
  const [loading, setLoading] = useState(false);
  const { markMealCompleted, likeMeal, dislikeMeal, getMealRating } = useDietContext();
  
  // Obter o status de like/dislike atual da refeição
  const rating = getMealRating(meal.id);

  const handleComplete = async (e) => {
    e.stopPropagation();
    if (isCompleted || loading) return;
    
    setLoading(true);
    try {
      await markMealCompleted(meal.id);
    } catch (error) {
      console.error('Erro ao marcar refeição como concluída:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleLike = async (e) => {
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    try {
      await likeMeal(meal.id);
    } catch (error) {
      console.error('Erro ao dar like na refeição:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDislike = async (e) => {
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    try {
      await dislikeMeal(meal.id);
    } catch (error) {
      console.error('Erro ao dar dislike na refeição:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      onClick={onMealClick} 
      sx={{ 
        cursor: 'pointer', 
        mb: 2, 
        position: 'relative',
        opacity: isCompleted ? 0.85 : 1,
        backgroundColor: isCompleted ? 'rgba(76, 175, 80, 0.08)' : 'inherit',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      {isCompleted && (
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Tooltip title="Refeição concluída">
            <CheckCircleIcon color="success" />
          </Tooltip>
        </Box>
      )}
      <CardHeader
        title={meal.name}
        subheader={`${meal.time} • ${meal.calories} kcal`}
      />
      <CardContent>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="body2" color="text.secondary">
            Proteínas: {meal.protein}g
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Carboidratos: {meal.carbs}g
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gorduras: {meal.fat}g
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" onClick={(e) => e.stopPropagation()}>
          <Box>
            <Tooltip title="Gostei desta refeição">
              <IconButton onClick={handleLike} disabled={loading} size="small">
                {rating.liked ? <ThumbUpIcon color="primary" /> : <ThumbUpOutlinedIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Não gostei desta refeição">
              <IconButton onClick={handleDislike} disabled={loading} size="small">
                {rating.disliked ? <ThumbDownIcon color="error" /> : <ThumbDownOutlinedIcon />}
              </IconButton>
            </Tooltip>
          </Box>
          
          {!isCompleted && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleComplete}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <RestaurantIcon />}
            >
              Concluir
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DietCard; 
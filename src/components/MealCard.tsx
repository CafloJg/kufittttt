import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardHeader, 
  CardContent, 
  Typography, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  Divider, 
  Tooltip, 
  Button, 
  Collapse,
  CircularProgress,
  Badge
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import { useDietContext } from '../context/DietContext';
import type { Meal } from '../types/user';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  position: 'relative',
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[8],
  },
}));

const CompletedBadge = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 8,
  right: 8,
  zIndex: 1,
}));

// Estilo personalizado para os botões de like/dislike
const StyledIconButton = styled(IconButton)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 8,
  '& .MuiSvgIcon-root': {
    display: 'flex',
    margin: 'auto',
  },
});

interface MealCardProps {
  meal: Meal;
  isCompleted: boolean;
  showExpandButton?: boolean;
}

const MealCard: React.FC<MealCardProps> = ({ 
  meal, 
  isCompleted, 
  showExpandButton = true 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const { markMealCompleted, likeMeal, dislikeMeal, getMealRating } = useDietContext();
  
  // Obter o status de like/dislike atual da refeição
  const rating = getMealRating(meal.id);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleComplete = async () => {
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
  
  const handleLike = async () => {
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
  
  const handleDislike = async () => {
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
    <StyledCard 
      variant="outlined" 
      sx={{
        opacity: isCompleted ? 0.85 : 1,
        backgroundColor: isCompleted ? 'rgba(76, 175, 80, 0.08)' : 'inherit',
      }}
    >
      {isCompleted && (
        <CompletedBadge>
          <Tooltip title="Refeição concluída">
            <CheckCircleIcon color="success" />
          </Tooltip>
        </CompletedBadge>
      )}
      
      <CardHeader
        title={meal.name}
        subheader={`${meal.time} - ${meal.calories} kcal`}
        action={
          showExpandButton && (
            <IconButton
              onClick={handleExpandClick}
              aria-expanded={expanded}
              aria-label="mostrar mais"
            >
              <ExpandMoreIcon 
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                }}
              />
            </IconButton>
          )
        }
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
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Tooltip title="Gostei desta refeição">
              <StyledIconButton
                onClick={handleLike}
                disabled={loading}
                size="medium"
                sx={{
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {rating.liked ? <ThumbUpIcon color="primary" /> : <ThumbUpOutlinedIcon />}
              </StyledIconButton>
            </Tooltip>
            
            <Tooltip title="Não gostei desta refeição">
              <StyledIconButton
                onClick={handleDislike}
                disabled={loading}
                size="medium"
                sx={{
                  display: 'inline-flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {rating.disliked ? <ThumbDownIcon color="error" /> : <ThumbDownOutlinedIcon />}
              </StyledIconButton>
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
              Concluir Refeição
            </Button>
          )}
        </Box>
        
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Alimentos:
          </Typography>
          <List dense>
            {meal.foods.map((food, index) => (
              <ListItem key={food.id || `food-${index}`} disableGutters>
                <ListItemText
                  primary={food.name}
                  secondary={`${food.portion} | ${food.calories} kcal | P: ${food.protein}g | C: ${food.carbs}g | G: ${food.fat}g`}
                />
              </ListItem>
            ))}
          </List>
        </Collapse>
      </CardContent>
    </StyledCard>
  );
};

export default MealCard;